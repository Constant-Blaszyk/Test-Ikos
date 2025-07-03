import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Test } from '../types';

interface TestContextType {
  testHistory: Test[];
  setTestHistory: React.Dispatch<React.SetStateAction<Test[]>>;
  activeTest: Test | null;
  setActiveTest: React.Dispatch<React.SetStateAction<Test | null>>;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [testHistory, setTestHistory] = useState<Test[]>([]);
  const [activeTest, setActiveTest] = useState<Test | null>(null);

  return (
    <TestContext.Provider
      value={{
        testHistory,
        setTestHistory,
        activeTest,
        setActiveTest,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTestContext = (): TestContextType => {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTestContext must be used within a TestProvider');
  }
  return context;
};