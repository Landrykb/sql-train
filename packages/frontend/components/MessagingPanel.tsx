'use client';

import React, { useState } from 'react';
import type { CloudSandboxState } from '@/lib/cloud/sandbox';
import { createSNSTopic, createSQSQueue, subscribeQueueToTopic, publishToSNS, sendSQSMessage, receiveSQSMessage } from '@/lib/cloud/sandboxActions';
import { CheckBadge } from '@/components/AppIcons';

export default function MessagingPanel({ state, onAction }: { state: CloudSandboxState; onAction: (s: CloudSandboxState) => void }) {
  const [active, setActive] = useState<'sns' | 'sqs'>('sns');
  const [topicName, setTopicName] = useState('');
  const [queueName, setQueueName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedQueue, setSelectedQueue] = useState('');
  const [subscribeQueue, setSubscribeQueue] = useState('');

  const topics = Object.values(state.messaging.topics);
  const queues = Object.values(state.messaging.queues);

  const handleCreateTopic = () => { if (topicName) { onAction(createSNSTopic(state, topicName)); setTopicName(''); } };
  const handleCreateQueue = () => { if (queueName) { onAction(createSQSQueue(state, queueName)); setQueueName(''); } };
  const handleSubscribe = () => { if (selectedTopic && subscribeQueue) { onAction(subscribeQueueToTopic(state, selectedTopic, subscribeQueue)); setSelectedTopic(''); setSubscribeQueue(''); } };
  const handlePublish = () => { if (selectedTopic && message) { onAction(publishToSNS(state, selectedTopic, message)); setMessage(''); } };
  const handleSend = () => { if (selectedQueue && message) { onAction(sendSQSMessage(state, selectedQueue, message)); setMessage(''); } };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setActive('sns')} className={`px-4 py-2 rounded-full text-xs font-bold ${active === 'sns' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>SNS Topics</button>
        <button onClick={() => setActive('sqs')} className={`px-4 py-2 rounded-full text-xs font-bold ${active === 'sqs' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>SQS Queues</button>
      </div>

      {active === 'sns' ? (
        <>
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Create SNS Topic</h3>
            <div className="flex gap-2">
              <input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
              <button onClick={handleCreateTopic} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create</button>
            </div>
          </div>

          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Publish / Subscribe</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="">Select topic</option>
                {topics.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              <select value={subscribeQueue} onChange={(e) => setSubscribeQueue(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="">Select SQS queue to subscribe</option>
                {queues.map((q) => <option key={q.name} value={q.name}>{q.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={handleSubscribe} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700">Subscribe Queue</button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to publish" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm mb-2" rows={3} />
            <button onClick={handlePublish} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">Publish to Topic</button>
          </div>

          {topics.length > 0 && (
            <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
              <h3 className="text-sm font-bold text-bleepx-text mb-3">Topics</h3>
              <div className="space-y-3">
                {topics.map((t) => (
                  <div key={t.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                    <div className="font-bold text-bleepx-text">{t.name}</div>
                    <div className="text-xs text-bleepx-text-secondary">{t.arn}</div>
                    <div className="text-xs text-bleepx-text-secondary mt-1">Subscribers: {t.subscriptions.length}</div>
                    {t.messages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {t.messages.map((m, i) => <code key={i} className="block text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-bleepx-text font-mono whitespace-pre-wrap break-words" title={m}>{m}</code>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Create SQS Queue</h3>
            <div className="flex gap-2">
              <input value={queueName} onChange={(e) => setQueueName(e.target.value)} placeholder="Queue name" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
              <button onClick={handleCreateQueue} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-bold hover:bg-sky-700">Create</button>
            </div>
          </div>

          <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-bleepx-text mb-3">Send / Receive</h3>
            <select value={selectedQueue} onChange={(e) => setSelectedQueue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm mb-3">
              <option value="">Select queue</option>
              {queues.map((q) => <option key={q.name} value={q.name}>{q.name}</option>)}
            </select>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message body" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm mb-2" rows={3} />
            <div className="flex gap-2">
              <button onClick={handleSend} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">Send</button>
              <button onClick={() => selectedQueue && onAction(receiveSQSMessage(state, selectedQueue))} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700">Receive</button>
            </div>
          </div>

          {queues.length > 0 && (
            <div className="bg-bleepx-white rounded-xl border border-bleepx-border p-5 shadow-sm">
              <h3 className="text-sm font-bold text-bleepx-text mb-3">Queues</h3>
              <div className="space-y-3">
                {queues.map((q) => (
                  <div key={q.name} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                    <div className="font-bold text-bleepx-text">{q.name}</div>
                    <div className="text-xs text-bleepx-text-secondary">{q.url}</div>
                    <div className="text-xs text-bleepx-text-secondary mt-1">Messages: {q.messages.length} ({q.messages.filter((m) => !m.received).length} pending)</div>
                    {q.messages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {q.messages.map((m) => (
                          <code key={m.id} className={`block text-[10px] px-2 py-1 rounded font-mono whitespace-pre-wrap break-words ${m.received ? 'bg-gray-100 dark:bg-gray-800 text-bleepx-text' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700'}`} title={m.body}>
                            {m.received ? <span className="inline-flex items-center gap-1"><CheckBadge size={10} /> {m.body}</span> : m.body}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 text-sm text-sky-700 dark:text-sky-300">
        <strong>SNS vs SQS on the exam:</strong> SNS is <em>push</em> fan-out (pub/sub, many subscribers, no persistence). SQS is <em>pull</em> queueing (buffer and decouple, guaranteed delivery, many consumers). Use SNS + SQS together to fan out to multiple queues.
      </div>
    </div>
  );
}
