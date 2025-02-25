import type { ReactNode, RouteComponent } from '@extension/router';

export type Route = {
  path: string;
  component: RouteComponent;
  icon?: ReactNode;
  label?: string;
};
