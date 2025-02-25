import { Outlet } from '@tanstack/react-router';
import './SidePanel.css';
import BaseLayout from './features/shared/layouts/BaseLayout';
import { withErrorBoundary, withSuspense } from '@extension/shared';

const SidePanel = () => {
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
};

export default withErrorBoundary(
  withSuspense(SidePanel, <div className="text-center p-4">加载中...</div>),
  <div className="text-center p-4 text-red-500">发生错误</div>,
);
