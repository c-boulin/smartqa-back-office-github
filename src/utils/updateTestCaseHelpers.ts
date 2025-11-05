// Helper functions for UpdateTestCaseModal

export const getStateNumber = (status: string): number => {
  const stateMap = {
    'active': 1,
    'draft': 2,
    'in_review': 3,
    'outdated': 4,
    'rejected': 5
  };
  return stateMap[status as keyof typeof stateMap] || 1;
};

export const getPriorityNumber = (priority: string): number => {
  const priorityMap = {
    'low': 4,
    'medium': 1,
    'high': 3,
    'critical': 2
  };
  return priorityMap[priority as keyof typeof priorityMap] || 1;
};

export const getTestTypeNumber = (type: string): number => {
  const typeMap = {
    'other': 1,
    'acceptance': 2,
    'accessibility': 3,
    'compatibility': 4,
    'destructive': 5,
    'functional': 6,
    'performance': 7,
    'regression': 8,
    'security': 9,
    'smoke': 10,
    'usability': 11
  };
  return typeMap[type as keyof typeof typeMap] || 6;
};

interface StepResultRelationship {
  type: "StepResult";
  id: string;
  meta: {
    order: number;
  };
}

export const buildStepResultsRelationships = (
  stepOrder: Array<{ type: 'step' | 'shared'; id: string }>,
  testSteps: Array<{ id: string; step: string; result: string; originalId?: string }>
): StepResultRelationship[] => {
  const stepResultsRelationships: StepResultRelationship[] = [];
  
  for (let position = 0; position < stepOrder.length; position++) {
    const orderItem = stepOrder[position];
    const order = position + 1;

    if (orderItem.type === 'step') {
      const step = testSteps.find(s => s.id === orderItem.id);
      if (step) {
        stepResultsRelationships.push({
          type: "StepResult",
          id: step.id,
          meta: {
            order: order
          }
        });
      }
    }
  }
  
  return stepResultsRelationships;
};

interface SharedStepRelationship {
  type: "SharedStep";
  id: string;
  meta: {
    order: number;
  };
}

export const buildSharedStepsRelationships = (
  stepOrder: Array<{ type: 'step' | 'shared'; id: string }>,
  sharedSteps: Array<{ id: string; title: string; pivotId?: number }>
): SharedStepRelationship[] => {
  const sharedStepsRelationships: SharedStepRelationship[] = [];
  
  for (let position = 0; position < stepOrder.length; position++) {
    const orderItem = stepOrder[position];
    const order = position + 1;

    if (orderItem.type === 'shared') {
      // Handle both new instance IDs (shared-{id}-{timestamp}) and existing pivot IDs (shared-{id}-{pivotId})
      const idParts = orderItem.id.split('-');
      if (idParts.length >= 3 && idParts[0] === 'shared') {
        const sharedStepId = idParts[1];
        const thirdPart = idParts[2];
        
        // Check if it's a pivot ID (from existing data) or timestamp (from new instances)
        const isPivotId = !isNaN(parseInt(thirdPart)) && parseInt(thirdPart) < 1000000000000; // Pivot IDs are smaller than timestamps
        
        if (isPivotId) {
          // Existing shared step with pivot ID - find by both ID and pivot ID
          const pivotId = parseInt(thirdPart);
          const sharedStep = sharedSteps.find(s => s.id === sharedStepId && s.pivotId === pivotId);
          if (sharedStep) {
            sharedStepsRelationships.push({
              type: "SharedStep",
              id: `/api/shared_steps/${sharedStep.id}`,
              meta: {
                order: order
              }
            });
          }
        } else {
          // New shared step instance with timestamp - find by position in array
          let sharedStepIndex = 0;
          for (let i = 0; i < position; i++) {
            if (stepOrder[i].type === 'shared') {
              sharedStepIndex++;
            }
          }
          
          const sharedStep = sharedSteps[sharedStepIndex];
          if (sharedStep) {
            sharedStepsRelationships.push({
              type: "SharedStep",
              id: `/api/shared_steps/${sharedStep.id}`,
              meta: {
                order: order
              }
            });
          }
        }
      }
    }
  }
  
  return sharedStepsRelationships;
};