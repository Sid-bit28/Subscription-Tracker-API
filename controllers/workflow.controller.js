import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { serve } = require('@upstash/workflow/express');
import dayjs from 'dayjs';

import Subscription from '../models/subscription.model.js';
import { sendReminderEmail } from '../utils/send-email.js';
import { now } from 'mongoose';

const REMINDERS = [7, 5, 2, 1];

export const sendReminders = serve(async context => {
  const { subscriptionId } = context.requestPayload;
  const subscription = await fetchSubscription(context, subscriptionId);

  if (!subscription || subscription.status !== 'active') {
    return;
  }

  const renewalDate = dayjs(subscription.renewalDate);

  if (renewalDate.isBefore(dayjs())) {
    console.log(
      `Renewal date has passed for subscription ${subscriptionId}. Stopping workflow.`
    );
    return;
  }

  for (const daysBefore of REMINDERS) {
    const reminderDate = renewalDate.subtract(daysBefore, 'day');
    // Schedule date = 22 feb, reminder date = 15 feb, 17, 20, 21

    if (reminderDate.isAfter(dayjs())) {
      await sleepUntillReminder(
        context,
        `Reminder ${daysBefore} days before.`,
        reminderDate
      );
    }

    if (dayjs().isSame(reminderDate, 'day')) {
      await triggerReminder(
        context,
        `${daysBefore} days before reminder`,
        subscription
      );
    }
    
  }
});

const fetchSubscription = async (context, subscriptionId) => {
  return await context.run('get subscription', () => {
    return Subscription.findById(subscriptionId).populate('user', 'name email');
  });
};

const sleepUntillReminder = async (context, label, date) => {
  console.log(`Sleeping untill ${label} reminder at ${date}`);
  await context.sleepUntill(label, date.toDate());
};

const triggerReminder = async (context, label, subscription) => {
  return await context.run(label, async () => {
    console.log(`Triggering ${label} reminder.`);
    await sendReminderEmail({
      to: subscription.user.email,
      type: label,
      subscription,
    });
  });
};
