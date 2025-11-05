/**
 * React 错误边界组件
 * 捕获子组件中的错误并显示友好的错误界面
 */

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // TODO: 可以在这里上报错误到日志服务
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-500 mb-4">
                ⚠️ 应用错误
              </h1>
              
              <p className="text-gray-300 mb-4">
                很抱歉，应用遇到了一个错误。请尝试重新加载。
              </p>

              {this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300 mb-2">
                    查看错误详情
                  </summary>
                  <div className="bg-black/30 rounded p-4 font-mono text-sm text-red-400 overflow-auto">
                    <p className="mb-2">{this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-4">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  重试
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  重新加载
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

