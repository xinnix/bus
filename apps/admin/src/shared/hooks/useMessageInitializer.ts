import { useEffect } from 'react';
import { App } from 'antd';
import { setMessageInstance } from '../dataProvider/dataProvider';

/**
 * Hook to initialize message instance for dataProvider
 * This should be used in the root component
 */
export const useMessageInitializer = () => {
  const { message } = App.useApp();

  useEffect(() => {
    setMessageInstance(message);
  }, [message]);
};
