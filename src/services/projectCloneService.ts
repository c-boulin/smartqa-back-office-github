import { projectsApiService } from './projectsApi';
import { foldersApiService } from './foldersApi';
import { testCasesApiService } from './testCasesApi';
import { sharedStepsApiService } from './sharedStepsApi';
import { tagsApiService, Tag } from './tagsApi';
import { attachmentsApiService } from './attachmentsApi';
import { apiService } from './api';

interface FolderMapping {
  oldId: string;
  newId: string;
  oldParentId?: string;
  newParentId?: string;
}

interface TestCaseMapping {
  oldId: string;
  newId: string;
}

interface SharedStepMapping {
  oldId: string;
  newId: string;
}

export class ProjectCloneService {
  async cloneProject(
    sourceProjectId: string,
    newProjectTitle: string,
    newProjectDescription: string,
    userId: string
  ): Promise<string> {
    try {
      const newProjectResponse = await projectsApiService.createProject({
        title: newProjectTitle,
        description: newProjectDescription
      });

      const newProjectId = newProjectResponse.data.attributes.id.toString();

      const folderMapping: FolderMapping[] = [];
      const testCaseMapping: TestCaseMapping[] = [];
      const sharedStepMapping: SharedStepMapping[] = [];

      await this.cloneFolders(sourceProjectId, newProjectId, userId, folderMapping);

      await this.cloneSharedSteps(sourceProjectId, newProjectId, userId, sharedStepMapping);

      await this.cloneTestCases(
        sourceProjectId,
        newProjectId,
        userId,
        folderMapping,
        sharedStepMapping,
        testCaseMapping
      );

      return newProjectId;
    } catch (error) {
      console.error('Error cloning project:', error);
      throw error;
    }
  }

  private async cloneFolders(
    sourceProjectId: string,
    newProjectId: string,
    userId: string,
    folderMapping: FolderMapping[]
  ): Promise<void> {
    const foldersResponse = await foldersApiService.getFolders(sourceProjectId);

    if (!foldersResponse.data || foldersResponse.data.length === 0) {
      return;
    }

    const folders = foldersResponse.data.map(apiFolder =>
      foldersApiService.transformApiFolder(apiFolder, sourceProjectId)
    );

    await this.cloneFoldersParallel(folders, newProjectId, userId, folderMapping);
  }

  private async cloneFoldersParallel(
    folders: Array<{ id: string; name: string; description?: string; parentId?: string; children: unknown[] }>,
    newProjectId: string,
    userId: string,
    folderMapping: FolderMapping[]
  ): Promise<void> {
    const foldersByDepth: Map<number, typeof folders> = new Map();
    const folderDepthMap: Map<string, number> = new Map();

    const calculateDepth = (folderId: string, visited = new Set<string>()): number => {
      if (visited.has(folderId)) return 0;
      visited.add(folderId);

      const folder = folders.find(f => f.id === folderId);
      if (!folder || !folder.parentId) return 0;

      return 1 + calculateDepth(folder.parentId, visited);
    };

    for (const folder of folders) {
      const depth = calculateDepth(folder.id);
      folderDepthMap.set(folder.id, depth);

      if (!foldersByDepth.has(depth)) {
        foldersByDepth.set(depth, []);
      }
      foldersByDepth.get(depth)!.push(folder);
    }

    const maxDepth = Math.max(...Array.from(folderDepthMap.values()), -1);

    for (let depth = 0; depth <= maxDepth; depth++) {
      const foldersAtDepth = foldersByDepth.get(depth) || [];

      const results = await Promise.allSettled(
        foldersAtDepth.map(async (folder) => {
          const newParentId = folder.parentId
            ? folderMapping.find(fm => fm.oldId === folder.parentId)?.newId
            : undefined;

          const createFolderResponse = await foldersApiService.createFolder({
            name: folder.name,
            description: folder.description || '',
            projectId: newProjectId,
            parentId: newParentId,
            childrenIds: [],
            userId: userId
          });

          const newFolderId = createFolderResponse.data.attributes.id.toString();

          return {
            oldId: folder.id,
            newId: newFolderId,
            oldParentId: folder.parentId,
            newParentId: newParentId
          };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          folderMapping.push(result.value);
        } else {
          console.error('Error cloning folder:', result.reason);
        }
      }
    }
  }

  private async cloneStepResultsBatch(
    stepResultIds: string[],
    userId: string,
    getStepResult: (id: string) => Promise<{ data: { id: string; type: string; attributes: { id: number; step: string; result: string; order: number } } }>,
    createStepResult: (data: { step: string; result: string; userId: string }) => Promise<{ data: { id: string; type: string; attributes: { id: number; step: string; result: string } } }>
  ): Promise<Array<{ id: string; order: number }>> {
    const BATCH_SIZE = 15;
    const newStepResults: Array<{ id: string; order: number }> = [];

    for (let i = 0; i < stepResultIds.length; i += BATCH_SIZE) {
      const batch = stepResultIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (stepResultId, batchIndex) => {
          const stepResultResponse = await getStepResult(stepResultId);
          const oldStepResult = stepResultResponse.data;

          const newStepResultResponse = await createStepResult({
            step: oldStepResult.attributes.step,
            result: oldStepResult.attributes.result,
            userId: userId
          });

          return {
            id: newStepResultResponse.data.attributes.id.toString(),
            order: i + batchIndex + 1
          };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          newStepResults.push(result.value);
        } else {
          console.error('Error cloning step result:', result.reason);
        }
      }
    }

    return newStepResults;
  }

  private async cloneTestCaseAttachments(
    testCaseId: string,
    userId: string
  ): Promise<Array<{ type: string; id: string }>> {
    try {
      const response = await apiService.authenticatedRequest(
        `/test_cases/${testCaseId}/attachments`
      );

      if (!response?.data?.relationships?.attachments?.data) {
        return [];
      }

      const attachmentRefs = response.data.relationships.attachments.data;
      const clonedAttachments: Array<{ type: string; id: string }> = [];

      for (const attachmentRef of attachmentRefs) {
        try {
          const attachmentId = attachmentRef.id.split('/').pop() || attachmentRef.id;
          const attachmentResponse = await apiService.authenticatedRequest(`/attachments/${attachmentId}`);

          if (attachmentResponse?.data?.attributes?.url) {
            const newAttachmentResponse = await attachmentsApiService.createAttachment({
              url: attachmentResponse.data.attributes.url,
              userId: userId
            });

            clonedAttachments.push({
              type: "Attachment",
              id: `/api/attachments/${newAttachmentResponse.data.attributes.id}`
            });
          }
        } catch (error) {
          console.error('Error cloning attachment:', error);
        }
      }

      return clonedAttachments;
    } catch (error) {
      console.error('Error fetching test case attachments:', error);
      return [];
    }
  }

  private async cloneSharedSteps(
    sourceProjectId: string,
    newProjectId: string,
    userId: string,
    sharedStepMapping: SharedStepMapping[]
  ): Promise<void> {
    const allSharedSteps: Array<{ id: string; title: string; description: string; tags: string[]; steps: Array<{ id: string; action: string; expectedResult: string; order: number }> }> = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const sharedStepsResponse = await sharedStepsApiService.getSharedSteps(
        sourceProjectId,
        currentPage,
        100
      );

      if (!sharedStepsResponse.data || sharedStepsResponse.data.length === 0) {
        break;
      }

      const sharedSteps = sharedStepsResponse.data.map(apiSharedStep =>
        sharedStepsApiService.transformApiSharedStep(apiSharedStep, sharedStepsResponse.included || [])
      );

      allSharedSteps.push(...sharedSteps);

      hasMorePages = currentPage < sharedStepsResponse.meta.totalPages;
      currentPage++;
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < allSharedSteps.length; i += BATCH_SIZE) {
      const batch = allSharedSteps.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (sharedStep) => {
          let newStepResults: Array<{ id: string; order: number }> = [];

          if (sharedStep.stepResults && sharedStep.stepResults.length > 0) {
            newStepResults = await this.cloneStepResultsBatch(
              sharedStep.stepResults,
              userId,
              (id) => sharedStepsApiService.getStepResult(id),
              (data) => sharedStepsApiService.createStepResult(data)
            );
          }

          const newSharedStepResponse = await sharedStepsApiService.createSharedStep({
            title: sharedStep.title,
            projectId: newProjectId,
            creatorId: userId,
            stepResults: newStepResults
          });

          return {
            oldId: sharedStep.id,
            newId: newSharedStepResponse.data.attributes.id.toString()
          };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sharedStepMapping.push(result.value);
        } else {
          console.error('Error cloning shared step:', result.reason);
        }
      }
    }
  }

  private async cloneTestCases(
    sourceProjectId: string,
    newProjectId: string,
    userId: string,
    folderMapping: FolderMapping[],
    sharedStepMapping: SharedStepMapping[],
    testCaseMapping: TestCaseMapping[]
  ): Promise<void> {
    const allTagsResponse = await tagsApiService.getTags();
    const allTags = allTagsResponse.data.map(apiTag => tagsApiService.transformApiTag(apiTag));

    const priorityMap: { [key: string]: number } = {
      low: 4,
      medium: 1,
      high: 3,
      critical: 2
    };

    const typeMap: { [key: string]: number } = {
      other: 1,
      acceptance: 2,
      accessibility: 3,
      compatibility: 4,
      destructive: 5,
      functional: 6,
      performance: 7,
      regression: 8,
      security: 9,
      smoke: 10,
      usability: 11
    };

    const stateMap: { [key: string]: number } = {
      active: 1,
      draft: 2,
      in_review: 3,
      outdated: 4,
      deprecated: 4
    };

    const allTestCases: Array<{ id: string; title: string; description: string; priority: string; type: string; status: string; tags: string[] }> = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const testCasesResponse = await testCasesApiService.getTestCases(
        currentPage,
        100,
        sourceProjectId
      );

      if (!testCasesResponse.data || testCasesResponse.data.length === 0) {
        break;
      }

      const testCases = testCasesResponse.data.map(apiTestCase =>
        testCasesApiService.transformApiTestCase(apiTestCase, testCasesResponse.included)
      );

      allTestCases.push(...testCases);

      hasMorePages = currentPage < testCasesResponse.meta.totalPages;
      currentPage++;
    }

    allTestCases.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];

      try {
        let newFolderId: string | undefined = undefined;
        if (testCase.folderId) {
          const folderMap = folderMapping.find(fm => fm.oldId === testCase.folderId);
          newFolderId = folderMap?.newId;
        }

        let newStepResults: Array<{ id: string; order: number }> = [];

        if (testCase.stepResults && testCase.stepResults.length > 0) {
          newStepResults = await this.cloneStepResultsBatch(
            testCase.stepResults,
            userId,
            (id) => testCasesApiService.getStepResult(id),
            (data) => testCasesApiService.createStepResult(data)
          );
        }

        const newSharedSteps: Array<{ id: string; order: number }> = [];

        if (testCase.sharedSteps && testCase.sharedSteps.length > 0) {
          for (let j = 0; j < testCase.sharedSteps.length; j++) {
            const oldSharedStepId = testCase.sharedSteps[j];
            const sharedStepMap = sharedStepMapping.find(ssm => ssm.oldId === oldSharedStepId);
            if (sharedStepMap) {
              newSharedSteps.push({
                id: sharedStepMap.newId,
                order: j + 1
              });
            }
          }
        }

        const testCaseTags: Tag[] = [];
        if (testCase.tags && testCase.tags.length > 0) {
          for (const tagLabel of testCase.tags) {
            const existingTag = allTags.find(t => t.label === tagLabel);
            if (existingTag) {
              testCaseTags.push(existingTag);
            }
          }
        }

        const clonedAttachments = await this.cloneTestCaseAttachments(testCase.id, userId);

        const newTestCaseResponse = await testCasesApiService.createTestCase({
          title: testCase.title,
          description: testCase.description,
          priority: priorityMap[testCase.priority] || 2,
          testCaseType: typeMap[testCase.type] || 6,
          state: stateMap[testCase.status] || 1,
          automationStatus: testCase.automationStatus,
          estimatedDuration: testCase.estimatedDuration || 5,
          tags: testCaseTags,
          projectId: newProjectId,
          folderId: newFolderId,
          creatorId: userId,
          stepResults: newStepResults,
          sharedStepsForApi: newSharedSteps,
          createdAttachments: clonedAttachments,
          template: 1,
          preconditions: testCase.preconditions || ''
        });

        testCaseMapping.push({
          oldId: testCase.id,
          newId: newTestCaseResponse.data.attributes.id.toString()
        });
      } catch (error) {
        console.error('Error cloning test case:', error);
      }
    }
  }
}

export const projectCloneService = new ProjectCloneService();
