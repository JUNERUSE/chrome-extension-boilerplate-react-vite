import { Button } from '@heroui/button';
import { IconPlugConnected, IconPlugConnectedX, IconRefresh } from '@tabler/icons-react';
import { FC } from 'react';

import { ConnectionStatus } from '../hooks';

interface ConnectionStatusProps {
  connectionStatus: ConnectionStatus;
  onRefresh: () => void;
}

const ConnectionStatusIndicator: FC<ConnectionStatusProps> = ({ connectionStatus, onRefresh }) => {
  if (connectionStatus === ConnectionStatus.CONNECTED) {
    return (
      <div className="flex items-center text-xs text-green-600 dark:text-green-400 gap-1">
        <IconPlugConnected className="w-3.5 h-3.5" />
        <span>已连接到 YouTube</span>
        <Button isIconOnly size="sm" variant="light" className="ml-1 p-0" onPress={onRefresh}>
          <IconRefresh className="w-3 h-3" />
        </Button>
      </div>
    );
  } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
    return (
      <div className="flex items-center text-xs text-red-600 dark:text-red-400 gap-1">
        <IconPlugConnectedX className="w-3.5 h-3.5" />
        <span>未连接到 YouTube 视频页面</span>
        <Button isIconOnly size="sm" variant="light" className="ml-1 p-0" onPress={onRefresh}>
          <IconRefresh className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return null;
};

export default ConnectionStatusIndicator;
