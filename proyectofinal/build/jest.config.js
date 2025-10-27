"use strict";
const baseTestDir = '<rootDir>/test';
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'report',
                outputName: 'report.xml',
            },
        ],
        ['jest-html-reporters', {
                publicPath: './report',
                filename: 'prueba_unitaria.html',
                pageTitle: "BANCO BOLIVARIANO - PRUEBA UNITARIA - HISTORIA CDM-2680",
                expand: true
            }]
    ],
    coverageReporters: ['html'],
    coverageDirectory: './report/cobertura',
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,js}',
        '!src/**/*.spec.{ts,js}'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9qZXN0LmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUM7QUFFckMsTUFBTSxDQUFDLE9BQU8sR0FBRztJQUNmLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLGdCQUFnQixDQUFDO0lBQ3pCLFNBQVMsRUFBRSxDQUFDLGNBQWMsQ0FBQztJQUMzQixTQUFTLEVBQUU7UUFDVCxTQUFTO1FBQ1Q7WUFDRSxZQUFZO1lBQ1o7Z0JBQ0UsZUFBZSxFQUFFLFFBQVE7Z0JBQ3pCLFVBQVUsRUFBRSxZQUFZO2FBQ3pCO1NBQ0Y7UUFDRCxDQUFDLHFCQUFxQixFQUFFO2dCQUN0QixVQUFVLEVBQUUsVUFBVTtnQkFDdEIsUUFBUSxFQUFFLHNCQUFzQjtnQkFDaEMsU0FBUyxFQUFFLHFDQUFxQztnQkFDaEQsTUFBTSxFQUFFLElBQUk7YUFDYixDQUFDO0tBQ0g7SUFDRCxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUMzQixpQkFBaUIsRUFBRSxvQkFBb0I7SUFDdkMsZUFBZSxFQUFFLElBQUk7SUFDckIsbUJBQW1CLEVBQUU7UUFDbkIsa0JBQWtCO1FBQ2xCLGdCQUFnQjtRQUNoQix3QkFBd0I7UUFDeEIsd0JBQXdCO0tBQ3pCO0lBQ0QsaUJBQWlCLEVBQUU7UUFDakIsTUFBTSxFQUFFO1lBQ04sUUFBUSxFQUFFLEVBQUU7WUFDWixTQUFTLEVBQUUsRUFBRTtZQUNiLEtBQUssRUFBRSxFQUFFO1lBQ1QsVUFBVSxFQUFFLEVBQUU7U0FDZjtLQUNGO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGJhc2VUZXN0RGlyID0gJzxyb290RGlyPi90ZXN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByZXNldDogJ3RzLWplc3QnLFxuICB0ZXN0RW52aXJvbm1lbnQ6ICdub2RlJyxcbiAgcm9vdHM6IFsnPHJvb3REaXI+L3Rlc3QnXSxcbiAgdGVzdE1hdGNoOiBbJyoqLyoudGVzdC50cyddLFxuICByZXBvcnRlcnM6IFtcbiAgICAnZGVmYXVsdCcsXG4gICAgW1xuICAgICAgJ2plc3QtanVuaXQnLFxuICAgICAge1xuICAgICAgICBvdXRwdXREaXJlY3Rvcnk6ICdyZXBvcnQnLFxuICAgICAgICBvdXRwdXROYW1lOiAncmVwb3J0LnhtbCcsXG4gICAgICB9LFxuICAgIF0sXG4gICAgWydqZXN0LWh0bWwtcmVwb3J0ZXJzJywge1xuICAgICAgcHVibGljUGF0aDogJy4vcmVwb3J0JyxcbiAgICAgIGZpbGVuYW1lOiAncHJ1ZWJhX3VuaXRhcmlhLmh0bWwnLFxuICAgICAgcGFnZVRpdGxlOiBcIkJBTkNPIEJPTElWQVJJQU5PIC0gUFJVRUJBIFVOSVRBUklBXCIsXG4gICAgICBleHBhbmQ6IHRydWVcbiAgICB9XVxuICBdLFxuICBjb3ZlcmFnZVJlcG9ydGVyczogWydodG1sJ10sXG4gIGNvdmVyYWdlRGlyZWN0b3J5OiAnLi9yZXBvcnQvY29iZXJ0dXJhJyxcbiAgY29sbGVjdENvdmVyYWdlOiB0cnVlLFxuICBjb2xsZWN0Q292ZXJhZ2VGcm9tOiBbXG4gICAgJ3NyYy8qKi8qLnt0cyxqc30nLFxuICAgICchc3JjLyoqLyouZC50cycsXG4gICAgJyFzcmMvKiovKi50ZXN0Lnt0cyxqc30nLFxuICAgICchc3JjLyoqLyouc3BlYy57dHMsanN9J1xuICBdLFxuICBjb3ZlcmFnZVRocmVzaG9sZDoge1xuICAgIGdsb2JhbDoge1xuICAgICAgYnJhbmNoZXM6IDgwLFxuICAgICAgZnVuY3Rpb25zOiA4MCxcbiAgICAgIGxpbmVzOiA4MCxcbiAgICAgIHN0YXRlbWVudHM6IDgwXG4gICAgfVxuICB9XG59OyJdfQ==