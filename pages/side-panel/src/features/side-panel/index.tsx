import { Outlet } from '@extension/router';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import BaseLayout from '../layout/BaseLayout';

const SidePanelBase = () => {
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
};

export const SidePanel = withErrorBoundary(
  withSuspense(SidePanelBase, <div className="text-center p-4">加载中...</div>),
  <div className="text-center p-4 text-red-500">发生错误</div>,
);
