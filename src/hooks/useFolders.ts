import { useState, useEffect, useRef, useCallback } from 'react';
import { foldersApiService, Folder } from '../services/foldersApi';
import toast from 'react-hot-toast';

export const useFolders = (projectId?: string | null) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  // Cache pour éviter les rechargements inutiles
  const foldersCache = useRef<Map<string, { folders: Folder[]; tree: Folder[] }>>(new Map());
  const previousProjectId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // Function to update folders with extracted data from test cases
  const updateFoldersFromTestCases = useCallback(async (extractedFolders: Array<Record<string, unknown>>, forceProjectId?: string) => {
    const targetProjectId = forceProjectId || projectId;
    
    console.log('📁 updateFoldersFromTestCases called with:', extractedFolders, 'project:', targetProjectId);
    
    if (!targetProjectId) {
      console.log('🚫 No project ID for folders');
      setFolders([]);
      setFolderTree([]);
      setSelectedFolderId(null);
      return;
    }

    console.log('📁 Processing', extractedFolders.length, 'extracted folders');
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📂 Fetching folder details and updating with test case counts');
      console.log('🔍 SEARCH_DEBUG: useFolders updateFoldersFromTestCases request made');
      const response = await foldersApiService.getFolders(targetProjectId);
      
      console.log('📂 Folders API response:', response);
      console.log('📂 API returned', response.data.length, 'folders');
      
      // Verify all folders belong to the correct project
      const invalidFolders = response.data.filter(folder => {
        const folderProjectId = folder.relationships.project.data.id.split('/').pop();
        return folderProjectId !== targetProjectId;
      });
      
      if (invalidFolders.length > 0) {
        console.warn('⚠️ Found folders that do not belong to project', targetProjectId, ':', invalidFolders);
      }
      
      // Transform API folders to our internal format
      console.log('🔄 Transforming folders...');
      const transformedFolders: Folder[] = [];
      
      for (const apiFolder of response.data) {
        // Double-check project ownership during transformation
        const folderProjectId = apiFolder.relationships.project.data.id.split('/').pop();
        if (folderProjectId !== targetProjectId) {
          console.warn('⚠️ Skipping folder that belongs to different project:', apiFolder.attributes.name, 'belongs to:', folderProjectId, 'expected:', targetProjectId);
          continue;
        }
        
        const transformed = foldersApiService.transformApiFolder(apiFolder, targetProjectId);
        
        // Initialize counts to 0 - will be calculated properly in buildFolderTree
        transformed.testCasesCount = 0;
        transformed.directTestCasesCount = 0;
        
        transformedFolders.push(transformed);
      }
      
      console.log('✅ Transformed', transformedFolders.length, 'folders');
      
      // Calculate test case counts for each folder from extracted data
      console.log('📊 Calculating test case counts from extracted data...');
      extractedFolders.forEach(extracted => {
        const folder = transformedFolders.find(tf => tf.id === extracted.id);
        if (folder) {
          folder.directTestCasesCount = extracted.testCasesCount;
          console.log('📊 Set direct count for folder', folder.name, ':', extracted.testCasesCount);
        } else {
          console.log('⚠️ Extracted folder not found in API:', extracted);
        }
      });
      
      // Build the folder tree and calculate total counts (including children)
      const tree = foldersApiService.buildFolderTree(transformedFolders);
      
      console.log('🌳 Built folder tree:', tree);
      console.log('🌳 Tree has', tree.length, 'root folders');
      
      // Mettre en cache les résultats
      foldersCache.current.set(targetProjectId, { folders: transformedFolders, tree });
      console.log('💾 Cached folders for project:', targetProjectId);
      
      setFolders(transformedFolders);
      setFolderTree(tree);
      
      // Auto-select the first folder SEULEMENT si aucun dossier n'est sélectionné OU si le projet a changé
      const projectChanged = previousProjectId.current !== targetProjectId;
      
      // Don't auto-select folder if coming from dashboard with filters
      const hasNavigationState = window.location.pathname === '/test-cases' && 
                                 window.history.state && 
                                 window.history.state.applyFilter;
      
      // NEVER auto-select folders - always start with no folder selected
      if (projectChanged) {
        console.log('🚫 Project changed - clearing folder selection to show all test cases');
        setSelectedFolderId(null);
      } else if (hasNavigationState) {
        console.log('🚫 Skipping auto-folder selection due to dashboard navigation');
        setSelectedFolderId(null);
      } else if (tree.length === 0) {
        console.log('⚠️ No folders in tree, clearing selection');
        setSelectedFolderId(null);
      }
      
      // Update the previous project ID
      previousProjectId.current = targetProjectId;
      isInitialized.current = true;
      
    } catch (err) {
      console.error('❌ Full folder error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch folders';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fonction fetchFolders stable qui ne change pas à chaque render
  const fetchFolders = useCallback(async (forceProjectId?: string) => {
    const targetProjectId = forceProjectId || projectId;
    
    if (!targetProjectId) {
      console.log('🚫 No project ID, clearing folders');
      setFolders([]);
      setFolderTree([]);
      setSelectedFolderId(null);
      setLoading(false);
      return;
    }

    // Vérifier le cache d'abord
    const cached = foldersCache.current.get(targetProjectId);
    if (cached) {
      console.log('✅ Using cached folders for project:', targetProjectId);
      setFolders(cached.folders);
      setFolderTree(cached.tree);
      
      // Auto-select first folder if none selected
      if (!selectedFolderId && cached.tree.length > 0) {
        const firstFolder = foldersApiService.getFirstFolder(cached.tree);
        if (firstFolder) {
          console.log('🎯 Auto-selecting first folder from cache:', firstFolder.name);
          setSelectedFolderId(firstFolder.id);
        }
      }
      
      setLoading(false);
      return;
    }

    // If no cache, we'll wait for test cases to provide folder data
    console.log('⏳ Waiting for test cases to provide folder data...');
  }, [projectId, selectedFolderId]);

  const selectFolder = useCallback((folderId: string | null) => {
    console.log('👆 Manually selecting folder ID:', folderId || 'none (deselected)');
    setSelectedFolderId(folderId);
  }, []);

  const getSelectedFolder = useCallback((): Folder | null => {
    if (!selectedFolderId) return null;
    
    // Search in the tree structure
    const found = foldersApiService.findFolderById(folderTree, selectedFolderId);
    if (found) {
      console.log('📁 Selected folder:', found.name, 'ID:', found.id, 'Test cases:', found.testCasesCount);
    }
    return found;
  }, [selectedFolderId, folderTree]);

  // Invalidate cache when project changes
  const invalidateCache = useCallback((projectId: string) => {
    console.log('🗑️ Invalidating cache for project:', projectId);
    foldersCache.current.delete(projectId);
  }, []);

  // Optimisation: utiliser le cache intelligent avec une logique plus stricte
  useEffect(() => {
    const projectChanged = previousProjectId.current !== projectId;
    
    console.log('🔄 useFolders effect triggered:', {
      projectId,
      projectChanged,
      isInitialized: isInitialized.current,
      previousProjectId: previousProjectId.current,
      hasCache: projectId ? foldersCache.current.has(projectId) : false
    });

    if (projectId) {
      const hasCache = foldersCache.current.has(projectId);
      
      if (hasCache) {
        // TOUJOURS utiliser le cache si disponible
        console.log('✅ Using cached folders for project:', projectId);
        const cached = foldersCache.current.get(projectId);
        if (cached) {
          setFolders(cached.folders);
          setFolderTree(cached.tree);
          setLoading(false);
          
          // NEVER auto-select folders from cache
          console.log('✅ Using cached folders without auto-selecting any folder');
        }
      }
    } else {
      console.log('🚫 No project ID, clearing all folder data');
      setFolders([]);
      setFolderTree([]);
      setSelectedFolderId(null);
      setLoading(false);
      previousProjectId.current = null;
      isInitialized.current = false;
    }
  }, [projectId, fetchFolders]); // Ajouter fetchFolders comme dépendance

  return {
    folders,
    folderTree,
    loading,
    error,
    selectedFolderId,
    updateFoldersFromTestCases,
    fetchFolders,
    selectFolder,
    getSelectedFolder,
    invalidateCache
  };
};