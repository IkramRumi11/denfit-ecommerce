// src/components/layout/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, RefreshCw, AlertTriangle, Mail } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Error display component
const ErrorDisplay: React.FC<{ 
  error: Error | null; 
  resetError: () => void;
}> = ({ error, resetError }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          We apologize for the inconvenience. Our team has been notified and we're working to fix the issue.
        </p>

        {/* Technical Details (Collapsible) */}
        <details className="text-left mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Technical Details
          </summary>
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <p><strong>Error:</strong> {error?.message || "Unknown error"}</p>
            <p><strong>Location:</strong> {location.pathname}</p>
            <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>

        {/* Support Contact */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Still need help?
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Here you can integrate with your error reporting service
    // logErrorToService(error, errorInfo);
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay 
          error={this.state.error} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

// Named export to match your import in App.tsx
export { ErrorBoundary };

// Default export for convenience
export default ErrorBoundary;

// Hook for using error boundary in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.error("Error caught by useErrorHandler:", error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, resetError };
};
