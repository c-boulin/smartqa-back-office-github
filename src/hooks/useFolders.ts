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

    if (!targetProjectId) {

      setFolders([]);
      setFolderTree([]);
      setSelectedFolderId(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Transform extracted folders directly to our internal format
      const transformedFolders: Folder[] = extractedFolders.map(extracted => ({
        id: String(extracted.id),
        name: String(extracted.name || ''),
        parentId: extracted.parentFolderId ? String(extracted.parentFolderId) : undefined,
        projectId: targetProjectId,
        testCasesCount: 0,
        directTestCasesCount: Number(extracted.testCasesCount || 0),
        children: []
      }));
      
      // Build the folder tree and calculate total counts (including children)
      const tree = foldersApiService.buildFolderTree(transformedFolders);


      // Mettre en cache les résultats
      foldersCache.current.set(targetProjectId, { folders: transformedFolders, tree });

      setFolders(transformedFolders);
      setFolderTree(tree);

      // Auto-select the first folder when there's only one folder (e.g., Default Folder)
      const projectChanged = previousProjectId.current !== targetProjectId;

      // Don't auto-select folder if coming from dashboard with filters
      const hasNavigationState = window.location.pathname === '/test-cases' &&
                                 window.history.state &&
                                 window.history.state.applyFilter;

      // Auto-select if there's exactly one folder (Default Folder scenario)
      if (tree.length === 1 && projectChanged && !hasNavigationState) {
        const firstFolder = tree[0];
        setSelectedFolderId(firstFolder.id);
      } else if (projectChanged) {
        setSelectedFolderId(null);
      } else if (hasNavigationState) {
        setSelectedFolderId(null);
      } else if (tree.length === 0) {
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

      setFolders([]);
      setFolderTree([]);
      setSelectedFolderId(null);
      setLoading(false);
      return;
    }

    // Vérifier le cache d'abord
    const cached = foldersCache.current.get(targetProjectId);
    if (cached) {

      setFolders(cached.folders);
      setFolderTree(cached.tree);

      // Auto-select first folder if none selected and there's exactly one folder
      if (!selectedFolderId && cached.tree.length === 1) {
        const firstFolder = foldersApiService.getFirstFolder(cached.tree);
        if (firstFolder) {

          setSelectedFolderId(firstFolder.id);
        }
      }

      setLoading(false);
      return;
    }

    // If no cache, we'll wait for test cases to provide folder data

  }, [projectId, selectedFolderId]);

  const selectFolder = useCallback((folderId: string | null) => {

    setSelectedFolderId(folderId);
  }, []);

  const getSelectedFolder = useCallback((): Folder | null => {
    if (!selectedFolderId) return null;
    
    // Search in the tree structure
    const found = foldersApiService.findFolderById(folderTree, selectedFolderId);
    if (found) {
      // Folder found in tree
    }
    return found;
  }, [selectedFolderId, folderTree]);

  // Invalidate cache when project changes
  const invalidateCache = useCallback((projectId: string) => {

    foldersCache.current.delete(projectId);
  }, []);

  // Optimisation: utiliser le cache intelligent avec une logique plus stricte
  useEffect(() => {
    const _projectChanged = previousProjectId.current !== projectId;

    if (projectId) {
      const hasCache = foldersCache.current.has(projectId);
      
      if (hasCache) {
        // TOUJOURS utiliser le cache si disponible

        const cached = foldersCache.current.get(projectId);
        if (cached) {
          setFolders(cached.folders);
          setFolderTree(cached.tree);
          setLoading(false);

          // Auto-select if there's exactly one folder from cache
          if (cached.tree.length === 1 && !selectedFolderId) {
            const firstFolder = foldersApiService.getFirstFolder(cached.tree);
            if (firstFolder) {
              setSelectedFolderId(firstFolder.id);
            }
          }

        }
      }
    } else {

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