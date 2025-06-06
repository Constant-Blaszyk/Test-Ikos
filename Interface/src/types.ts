export interface TestStep {
  description: string;
  status: string;
  result: string;
}

export interface Test {
  test_id: string;
  status: string;
  date_creation: string;
  pdf_id?: string;
  filename?: string;
  execution_time?: number;
  success?: boolean;
  steps?: TestStep[];
  error?: string;
}