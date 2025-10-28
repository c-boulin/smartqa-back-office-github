import { apiService } from './api';
// import { testCasesApiService } from './testCasesApi';

export interface ApiFolder {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships: {
    project: {
      data: { type: string; id: string };
    };
    parent?: {
      data: { type: string; id: string } | null;
    };
    children?: {
      data: Array<{ type: string; id: string }>;
    };
    testCases?: {
      data: Array<{ type: string; id: string }>;
    };
    creator: {
      data: { type: string; id: string };
    };
    editor: {
      data: { type: string; id: string };
    };
  };
}

export interface FoldersApiResponse {
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: ApiFolder[];
  included?: Array<Record<string, unknown>>;
}

export interface CreateFolderRequest {
  data: {
    type: "Folder";
    attributes: {
      name: string;
      description: string;
    };
    relationships: {
      parent?: {
        type: "Folder";
        type: "User";
        type: string;
        id: string;
      };
    };
  };
}

export interface CreateFolderResponse {
  data: ApiFolder;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
  children: Folder[];
  testCasesCount: number;
  directTestCasesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

class FoldersApiService {
  public getDefaultFoldersResponse(): FoldersApiResponse {
    return {
      links: {
        self: '',
        first: '',
        last: ''
      },
      meta: {
        totalItems: 0,
        itemsPerPage: 100,
        currentPage: 1
      },
      data: []
    };
  }

  async getFolders(projectId: string): Promise<FoldersApiResponse> {
    const response = await apiService.authenticatedRequest(`/folders?project=${projectId}&itemsPerPage=1000`);
    return response || this.getDefaultFoldersResponse();
  }

  async createFolder(folderData: {
    name: string;
    description: string;
    projectId: string;
    parentId?: string;
    childrenIds: string[];
    userId: string;
  }): Promise<CreateFolderResponse> {
    const requestBody: CreateFolderRequest = {
      data: {
        type: "Folder",
        attributes: {
          name: folderData.name,
          description: folderData.description
        },
        relationships: {
          project: {
            type: "Project",
            id: `/api/projects/${folderData.projectId}`
          },
          user: {
            type: "User",
            id: `/api/users/${folderData.userId}`
          }
        }
      }
    };

    // Add parent relationship if provided
    if (folderData.parentId) {
      requestBody.data.relationships.parent = {
        type: "Folder",
        id: `/api/folders/${folderData.parentId}`
      };
    }

    // Add children relationships - always include as array (empty if no children)
    requestBody.data.relationships.children = (folderData.childrenIds || []).map(childId => ({
      type: "Folder",
      id: `/api/folders/${childId}`
    }));

    // Note: test_cases relationship is empty for new folders
    // Test cases can be moved to folders later
    requestBody.data.relationships.test_cases = [];

    const response = await apiService.authenticatedRequest('/folders', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateFolder(folderId: string, folderData: {
    name: string;
    description: string;
    projectId: string;
    parentId?: string;
    childrenIds: string[];
    testCaseIds: string[];
    creatorId: string;
    editorId: string;
  }): Promise<UpdateFolderResponse> {
    const requestBody: UpdateFolderRequest = {
      data: {
        type: "Folder",
        attributes: {
          name: folderData.name,
          description: folderData.description
        },
        relationships: {
          user: {
            type: "User",
            id: `/api/users/${folderData.editorId}`
          }
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      await apiService.authenticatedRequest(`/folders/${folderId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Enhanced error handling for delete operations
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error('Folder not found. It may have already been deleted.');
        } else if (error.message.includes('409')) {
          throw new Error('Cannot delete folder. It may contain test cases or subfolders that need to be moved first.');
        } else if (error.message.includes('403')) {
          throw new Error('You do not have permission to delete this folder.');
        }
      }
      throw error;
    }
  }

  // Helper method to transform API folder to our internal format
  transformApiFolder(apiFolder: ApiFolder, projectId: string): Folder {
    // Verify the folder belongs to the correct project
    const folderProjectId = apiFolder.relationships.project.data.id.split('/').pop();
    if (folderProjectId !== projectId) {
      console.error('❌ Folder project mismatch:', apiFolder.attributes.name, 'belongs to project', folderProjectId, 'but expected', projectId);
    }
    
    const parentId = apiFolder.relationships.parent?.data?.id?.split('/').pop();
    
    console.log(`🔄 Transforming folder "${apiFolder.attributes.name}" (ID: ${apiFolder.attributes.id})`);
    console.log(`   - Parent ID: ${parentId || 'none (root folder)'}`);
    console.log(`   - Project ID: ${folderProjectId} (expected: ${projectId})`);
    
    return {
      id: apiFolder.attributes.id.toString(),
      name: apiFolder.attributes.name,
      description: apiFolder.attributes.description,
      projectId: projectId,
      parentId: parentId,
      children: [],
      testCasesCount: 0, // Will be calculated with test cases data
      directTestCasesCount: 0, // Will be calculated with test cases data
      createdAt: new Date(apiFolder.attributes.createdAt),
      updatedAt: new Date(apiFolder.attributes.updatedAt)
    };
  }

  // Build folder tree from flat list and calculate test cases count including children
  buildFolderTree(folders: Folder[]): Folder[] {
    console.log('🌳 Building folder tree from', folders.length, 'folders');
    console.log('📊 Folders to process:', folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId, directTestCasesCount: f.directTestCasesCount })));
    
    // Create a map of all folders with fresh children arrays
    const folderMap = new Map<string, Folder>();
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
      console.log(`   📁 Mapped folder: ${folder.name} (ID: ${folder.id})`);
    });

    const rootFolders: Folder[] = [];

    // Build the tree structure
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderNode);
          console.log(`   🔗 Added ${folderNode.name} as child of ${parent.name}`);
        } else {
          // Parent not found, treat as root
          rootFolders.push(folderNode);
          console.log(`   ⚠️ ${folderNode.name} treated as root (parent ${folder.parentId} not found)`);
        }
      } else {
        // No parent, this is a root folder
        rootFolders.push(folderNode);
        console.log(`   🌱 ${folderNode.name} is a root folder`);
      }
    });

    console.log('🧮 Calculating test cases counts recursively...');

    // Calculate total test cases count for each folder (including children) - RECURSIVE
    const calculateTotalTestCases = (folder: Folder): number => {
      let total = folder.directTestCasesCount || 0;
      console.log(`   📊 Calculating for "${folder.name}": starting with ${total} direct test cases`);
      
      // Add recursively the test cases from children
      folder.children.forEach(child => {
        const childTotal = calculateTotalTestCases(child);
        total += childTotal;
        console.log(`   ➕ Adding ${childTotal} from child "${child.name}" to "${folder.name}"`);
      });
      
      // IMPORTANT: Update the folder counter
      folder.testCasesCount = total;
      console.log(`   ✅ Final count for "${folder.name}": ${total} test cases (${folder.directTestCasesCount || 0} direct + ${total - (folder.directTestCasesCount || 0)} from children)`);
      
      return total;
    };

    // Calculate counts for all root folders (this will recursively calculate for all children)
    rootFolders.forEach(rootFolder => {
      calculateTotalTestCases(rootFolder);
    });

    console.log('🎯 Folder tree built with', rootFolders.length, 'root folders');
    
    // Log final results for debugging
    const logFolderCounts = (folderList: Folder[], indent = '') => {
      folderList.forEach(folder => {
        console.log(`${indent}📁 ${folder.name}: ${folder.testCasesCount} total (${folder.directTestCasesCount || 0} direct)`);
        if (folder.children.length > 0) {
          logFolderCounts(folder.children, indent + '  ');
        }
      });
    };
    
    console.log('📋 Final folder structure:');
    logFolderCounts(rootFolders);
    
    return rootFolders;
  }

  // Get first folder in tree - should be the first root folder
  getFirstFolder(folders: Folder[]): Folder | null {
    if (folders.length === 0) return null;
    
    console.log('🎯 First folder selected:', folders[0].name, 'ID:', folders[0].id);
    return folders[0];
  }

  // Find a folder by ID in the tree
  findFolderById(folders: Folder[], folderId: string): Folder | null {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.children.length > 0) {
        const found = this.findFolderById(folder.children, folderId);
        if (found) return found;
      }
    }
    return null;
  }
}

export const foldersApiService = new FoldersApiService();