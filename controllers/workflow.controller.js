import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { serve } = require('@upstash/workflow/express');
import dayjs from 'dayjs';

import Subscription from '../models/subscription.model.js';

const REMINDERS = [7, 5, 2, 1];

export const sendReminders = serve(async context => {
  const { subscriptionId } = context.requestPayload;
  const subscription = await fetchSubscription(context, subscriptionId);

  if (!subscription || subscription.status !== active) {
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

    await triggerReminder(context, `Reminder ${daysBefore} days before`);
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

const triggerReminder = async (context, label) => {
  return await context.run(label, () => {
    console.log(`Triggering ${label} reminder.`);
    //Send email, SMS, push notification
  });
};
