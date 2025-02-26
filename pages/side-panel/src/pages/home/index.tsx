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
    const data: FormValues = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));

    setSubmitted(data);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center px-4">
      <Form className="w-full flex flex-col items-center gap-2 justify-center" onSubmit={onSubmit}>
        <Textarea
          isRequired
          errorMessage="必须输入您的文字"
          labelPlacement="outside"
          name="text"
          placeholder="输入您的文字"
          minRows={10}
          maxRows={20}
        />
        <div className="flex gap-2 items-center justify-center">
          <Button type="reset">重置</Button>
          <Button type="submit" color="primary" isLoading={loading}>
            {loading ? '提交中...' : '提交'}
          </Button>
        </div>
      </Form>
      {submitted && (
        <div className="text-small text-default-500">
          You submitted: <code>{JSON.stringify(submitted)}</code>
        </div>
      )}
    </div>
  );
};

export default Home;
