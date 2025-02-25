import { Outlet } from '@extension/router';
import { withErrorBoundary, withSuspense } from '@extension/shared';

import BaseLayout from '../../layout/base-layout';

const SidePanel = () => {
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
};

export const SideSidePanelRoot = withErrorBoundary(
  withSuspense(SidePanel, <div className="text-center p-4">加载中...</div>),
  <div className="text-center p-4 text-red-500">发生错误</div>,
);
