import { Component } from "react";

export default class PageErrorBoundary extends Component {
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
      `[PageErrorBoundary:${this.props.title || "page"}]`,
      error,
      info?.componentStack
    );
  }

  handleRetry = () => {
    this.setState((prev) => ({
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    const { error, retryKey } = this.state;
    const {
      title = "Страница",
      children,
    } = this.props;

    if (error) {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-red-500/10 border border-red-500/30 p-6 md:p-8 rounded-2xl space-y-4">
            <div className="text-lg font-bold text-red-300">
              {title} временно недоступен
            </div>

            <p className="text-sm text-neutral-400">
              Произошла ошибка при загрузке.
              Остальные разделы CRM работают.
            </p>

            {import.meta.env.DEV && (
              <pre className="text-xs text-red-200/80 bg-surface-deep/60 p-3 rounded-xl overflow-x-auto">
                {error.message}
              </pre>
            )}

            <button
              type="button"
              onClick={this.handleRetry}
              className="
                px-4 py-2.5 rounded-xl font-semibold text-sm
                bg-red-600 hover:bg-red-700 transition-colors
              "
            >
              Повторить
            </button>
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
