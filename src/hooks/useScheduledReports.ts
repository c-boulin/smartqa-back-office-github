import { useState, useEffect, useCallback } from 'react';
import { scheduledReportsApiService, ScheduledReport } from '../services/scheduledReportsApi';
import toast from 'react-hot-toast';

export const useScheduledReports = (projectId?: string) => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduledReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const reports = await scheduledReportsApiService.getScheduledReports(projectId);
      setScheduledReports(reports);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scheduled reports';
      setError(errorMessage);
      console.error('Error fetching scheduled reports:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createScheduledReport = useCallback(async (payload: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      const newReport = await scheduledReportsApiService.createScheduledReport(payload);
      setScheduledReports(prev => [newReport, ...prev]);
      toast.success('Scheduled report created successfully');
      return newReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scheduled report';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateScheduledReport = useCallback(async (id: string, data: Partial<ScheduledReport>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedReport = await scheduledReportsApiService.updateScheduledReport(id, data);
      setScheduledReports(prev =>
        prev.map(report => (report.id === id ? updatedReport : report))
      );
      toast.success('Scheduled report updated successfully');
      return updatedReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scheduled report';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteScheduledReport = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await scheduledReportsApiService.deleteScheduledReport(id);
      setScheduledReports(prev => prev.filter(report => report.id !== id));
      toast.success('Scheduled report deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete scheduled report';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledReports();
  }, [fetchScheduledReports]);

  return {
    scheduledReports,
    loading,
    error,
    fetchScheduledReports,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
  };
};
