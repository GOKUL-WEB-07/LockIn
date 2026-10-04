import { Component, type ReactNode } from "react";
import { Button, Message } from "./ui";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <div className="route-error">
          <Message tone="error">
            This page could not be displayed. Reload to try again.
          </Message>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      );
    return this.props.children;
  }
}
