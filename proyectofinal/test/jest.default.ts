
export const jestmock = () => jest.mock('aws-xray-sdk-core', () => {
      const actualAWSXRay = jest.requireActual('aws-xray-sdk-core');
      const mockSegment = {
        close: jest.fn(),
        addNewSubsegment: jest.fn().mockReturnValue({
          addNewSubsegment: jest.fn(),
          addAnnotation: jest.fn(),
          addError: jest.fn(),
          close: jest.fn()
        }),
      };
      return {
        ...actualAWSXRay,
        getSegment: jest.fn().mockReturnValue(mockSegment),
      };
    });

afterAll(() => {
    jest.clearAllMocks();    
  });

