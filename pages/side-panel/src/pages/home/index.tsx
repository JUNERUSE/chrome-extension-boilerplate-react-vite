import { fetchForBackground } from '@extension/shared';
import { Button, Form, Textarea } from '@heroui/react';
import type { FC } from 'react';
import type React from 'react';
import { useState } from 'react';

interface FormValues {
  [key: string]: string;
}

const Home: FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<FormValues | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formValues: FormValues = {};

    formData.forEach((value, key) => {
      formValues[key] = value.toString();
    });

    setLoading(true);

    // 如果输入是URL，则更新API URL并触发新请求
    if (formValues.text) {
      await fetchForBackground({
        url: formValues.text,
        method: 'GET',
      });
    }

    setSubmitted(formValues);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center px-4 py-6 mb-14">
      <Form className="w-full flex flex-col items-center gap-2 justify-center" onSubmit={onSubmit}>
        <Textarea
          isRequired
          errorMessage="必须输入您的文字"
          labelPlacement="outside"
          name="text"
          placeholder="输入您的文字或API URL"
          minRows={6}
          maxRows={12}
          defaultValue="https://jsonplaceholder.typicode.com/todos/1"
          className="w-full"
        />
        <div className="flex gap-2 items-center justify-center">
          <Button type="reset">重置</Button>
          <Button type="submit" color="primary" isLoading={loading}>
            {loading ? '请求中...' : '提交'}
          </Button>
        </div>
      </Form>

      {submitted && (
        <div className="text-small text-default-500 w-full">
          <p className="mb-1">您提交的内容:</p>
          <code className="block p-2 bg-zinc-100 dark:bg-zinc-900 rounded-md overflow-y-auto text-sm whitespace-pre-wrap break-all">
            {JSON.stringify(submitted, null, 2)}
          </code>
        </div>
      )}
    </div>
  );
};

export default Home;
