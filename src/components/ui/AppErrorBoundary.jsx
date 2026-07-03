import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      retryKey: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      "[AppErrorBoundary]",
      error,
      info?.componentStack
    );
  }

  handleReload = () => {
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState((prev) => ({
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    const { error, retryKey } = this.state;
    const { children } = this.props;

    if (error) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-6 md:p-8 rounded-2xl max-w-md w-full space-y-4 text-center">
            <div className="text-xl font-bold text-red-300">
              Что-то пошло не так
            </div>

            <p className="text-sm text-slate-400">
              Приложение столкнулось с ошибкой.
              Попробуйте обновить страницу или
              вернуться на главную.
            </p>

            {import.meta.env.DEV && (
              <pre className="text-xs text-red-200/80 bg-slate-950/60 p-3 rounded-xl overflow-x-auto text-left">
                {error.message}
              </pre>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="
                  px-4 py-2.5 rounded-xl font-semibold text-sm
                  bg-slate-800 hover:bg-slate-700 transition-colors
                "
              >
                Повторить
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="
                  px-4 py-2.5 rounded-xl font-semibold text-sm
                  bg-cyan-600 hover:bg-cyan-700 transition-colors
                "
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={retryKey}>
        {children}
      </div>
    );
  }
}
