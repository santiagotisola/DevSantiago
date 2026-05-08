import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary genérico. Sem isso, qualquer throw em render no
 * subtree zerava a UI inteira para tela branca — comportamento
 * inaceitável em portaria/cobranças. Aqui mostramos um fallback
 * com botão "Tentar novamente" que reseta o boundary.
 *
 * Reportagem para Sentry/telemetria fica em componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary captured:", error, info);
    // Hook de Sentry/observability — adicionar quando configurado:
    // Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="max-w-md text-muted-foreground">
            Ocorreu um erro inesperado nesta tela. Você pode tentar novamente
            ou voltar para o início.
          </p>
          {import.meta.env.DEV && (
            <pre className="max-w-2xl overflow-auto rounded bg-muted p-4 text-left text-xs">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded border bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded border px-4 py-2 hover:bg-muted"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
