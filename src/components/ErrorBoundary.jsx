import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-slate-900 p-6">
          <h1 className="text-lg font-semibold">O portal encontrou um erro na tela.</h1>
          <p className="mt-2 text-sm text-slate-300">
            Atualize a página. Se continuar, limpe o cache do navegador ou tente em uma aba anônima.
          </p>
          <button
            className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-500"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
