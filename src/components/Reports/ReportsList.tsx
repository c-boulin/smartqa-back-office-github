import React from 'react';
import { Calendar, User, Download, Share, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface Report {
  id: string;
  name: string;
  type: 'execution' | 'project' | 'dashboard' | 'trend';
  projectId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;
}

interface ReportsListProps {
  reports: Report[];
  onViewReport: (report: Report) => void;
  onDeleteReport: (report: Report) => void;
  onDownloadReport: (report: Report) => void;
  onShareReport: (report: Report) => void;
}

const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  onViewReport,
  onDeleteReport,
  onDownloadReport,
  onShareReport
}) => {
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'execution':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'project':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'dashboard':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'trend':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'execution':
        return 'Test Execution Report';
      case 'project':
        return 'Project Summary Report';
      case 'dashboard':
        return 'Dashboard Report';
      case 'trend':
        return 'Trend Analysis Report';
      default:
        return 'Unknown Report';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{report.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getReportTypeColor(report.type)}`}>
                {getReportTypeLabel(report.type)}
              </span>
            </div>
            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                {format(report.dateRange.start, 'MMM dd')} - {format(report.dateRange.end, 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <User className="w-4 h-4 mr-2" />
              <span>{report.createdBy}</span>
            </div>
            <div className="text-sm text-gray-400">
              Created: {format(report.createdAt, 'MMM dd, yyyy')}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewReport(report)}
              className="flex-1"
            >
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => onDownloadReport(report)}
              className="p-2"
              title="Download"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Share}
              onClick={() => onShareReport(report)}
              className="p-2"
              title="Share"
            />
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => onDeleteReport(report)}
              className="p-2"
              title="Delete"
            />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ReportsList;