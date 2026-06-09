import { Component } from "react";

export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[WidgetErrorBoundary:${this.props.title || "widget"}]`,
      error,
      info?.componentStack
    );
  }

  render() {
    const { error } = this.state;
    const {
      title = "Блок",
      children,
      className = "",
    } = this.props;

    if (error) {
      return (
        <div
          className={`
            bg-slate-900 border border-red-500/20
            p-4 rounded-2xl text-sm
            ${className}
          `}
        >
          <div className="text-red-300 font-semibold">
            {title} не загрузился
          </div>
          <p className="text-slate-500 mt-1">
            Остальной dashboard доступен
          </p>
        </div>
      );
    }

    return children;
  }
}
