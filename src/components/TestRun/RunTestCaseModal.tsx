import React, { useState } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { Play } from 'lucide-react';

interface RunTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  testRunName: string;
  selectedTestCase?: {
    id: string;
    code: string;
    title: string;
  };
  availableAutomatedTestCases?: TestCase[];
}

interface Service {
  id: string;
  name: string;
  url: string;
}

interface Device {
  id: string;
  name: string;
}

interface TestCase {
  id: string;
  code: string;
  title: string;
}

const mockServices: Service[] = [
  { id: '1', name: 'Playyod', url: 'https://www.playyod.com' },
  { id: '2', name: 'FR', url: 'https://www.playyod.com' },
  { id: '3', name: 'MA', url: 'https://www.playyod.ma' },
  { id: '4', name: 'Fuzeforge', url: 'https://store.fuzeforge.com' },
  { id: '5', name: 'FR', url: 'https://store.fuzeforge.com' },
  { id: '6', name: 'MA', url: 'https://www.fuzeforge.at' },
  { id: '7', name: 'AT', url: 'https://www.fuzeforge.es/' },
  { id: '8', name: 'CH', url: 'https://www.fuzeforge.ch' },
];

const mockDevices: Device[] = [
  { id: '1', name: 'GalaxyS9_UA' },
  { id: '2', name: 'GalaxyS8_UA' },
  { id: '3', name: 'Iphone12_UA' },
  { id: '4', name: 'IphoneSE_UA' },
  { id: '5', name: 'Desktop_UA' },
];

const mockTestCases: TestCase[] = [
  { id: '1', code: 'TC24', title: 'Sign In Page Navbar' },
  { id: '2', code: 'TC26', title: 'Account Page Stub' },
  { id: '3', code: 'TC18', title: 'Home Page Unlogged' },
  { id: '4', code: 'TC19', title: 'Home Page Sub' },
  { id: '5', code: 'TC27', title: 'Film Product Page Sub' },
  { id: '6', code: 'TC22', title: 'Video Product Page Sub' },
  { id: '7', code: 'TC29', title: 'Articles Product Page Sub' },
];

const RunTestCaseModal: React.FC<RunTestCaseModalProps> = ({ isOpen, onClose, testRunName, selectedTestCase, availableAutomatedTestCases = [] }) => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [runLabel, setRunLabel] = useState('');
  const [selectAllTestCases, setSelectAllTestCases] = useState(false);

  // Initialize selected test case if provided and reset on close
  React.useEffect(() => {
    if (isOpen && selectedTestCase) {
      setSelectedTestCases(new Set([selectedTestCase.id]));
      setSelectAllTestCases(false);
    } else if (isOpen && !selectedTestCase) {
      setSelectedTestCases(new Set());
      setSelectAllTestCases(false);
    } else if (!isOpen) {
      // Reset form when modal closes
      setSelectedService('');
      setSelectedDevice('');
      setSelectedTestCases(new Set());
      setRunLabel('');
      setSelectAllTestCases(false);
    }
  }, [isOpen, selectedTestCase]);

  // Determine which test cases to display
  const displayTestCases = selectedTestCase
    ? [{ id: selectedTestCase.id, code: selectedTestCase.code, title: selectedTestCase.title }]
    : availableAutomatedTestCases.length > 0
      ? availableAutomatedTestCases
      : mockTestCases;

  const handleTestCaseToggle = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCases(newSelected);
    setSelectAllTestCases(newSelected.size === displayTestCases.length);
  };

  const handleSelectAllTestCases = () => {
    if (selectAllTestCases) {
      setSelectedTestCases(new Set());
      setSelectAllTestCases(false);
    } else {
      setSelectedTestCases(new Set(displayTestCases.map(tc => tc.id)));
      setSelectAllTestCases(true);
    }
  };

  const handleRunJob = () => {
    console.log('Running job with:', {
      service: selectedService,
      device: selectedDevice,
      testCases: Array.from(selectedTestCases),
      runLabel
    });
    onClose();
  };

  const isFormValid = selectedService && selectedDevice && selectedTestCases.size > 0;

  const modalTitle = selectedTestCase
    ? `Run Test Case: ${selectedTestCase.code} - ${testRunName}`
    : `Run Test Cases - ${testRunName}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Service <span className="text-cyan-500">*</span>
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Select the service...</option>
            {mockServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.url}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-cyan-500">(*) indicates that it is required</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Device <span className="text-cyan-500">*</span>
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Select the device...</option>
            {mockDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Test cases <span className="text-cyan-500">*</span>
            </label>
            {!selectedTestCase && (
              <button
                onClick={handleSelectAllTestCases}
                className="text-sm text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                Select All
              </button>
            )}
          </div>
          <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-900 max-h-64 overflow-y-auto">
            <p className="text-sm text-slate-400 mb-3">
              {selectedTestCase ? 'Running the selected test case:' : 'Select one or more test cases to run.'}
            </p>
            <div className="space-y-2">
              {displayTestCases.map((testCase) => (
                <label
                  key={testCase.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTestCases.has(testCase.id)}
                    onChange={() => handleTestCaseToggle(testCase.id)}
                    disabled={!!selectedTestCase}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-300">
                    {testCase.code} {testCase.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Run Label (optional)
          </label>
          <input
            type="text"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            placeholder="Maakta_yod"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRunJob}
            disabled={!isFormValid}
            className="flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Run Job Now</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RunTestCaseModal;
