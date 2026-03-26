# Product Brief: Urgent Shifts

Our workers on Mars are not always able to attend the shifts they claim. Whether they are just brand new workers who forgot they had an upcoming shift, their spacesuit is malfunctioning, or the Martian Subway is out of commission. For our workplace customers, this is quite damaging: we’ve told them that we can provide a worker for their shift, but we don’t come through, leaving workplaces short-staffed.

In addition to being a generally negative experience, workers not showing up to the shifts they claimed is a significant driver of workplace churn, so it’s important that we address it.

_From [calling customers](https://www.notion.so/10b8643321f48009b082cba50a65107d?pvs=21), most of the time, workers intend to fulfill these shifts, but encounter unforeseen circumstances that make them unable to make it to the shift. Basic data for cancellations can be found in this [spreadsheet](https://docs.google.com/spreadsheets/d/1JNrD2IPXVhYHFWWGWCA85ayj4ItnEHMxe9EVcs6KvqQ/edit?usp=sharing)._

## Solution

For shifts where the original worker isn’t able to attend, we’ll make those shifts available for other workers on the market, but with a higher pay rate.

30 minutes before the shift, we’ll send a notification to the assigned worker reminding them of their shift. We’ll also include a button that workers can push to indicate that they won’t be able to make it to the shift.

![Screenshot 2024-09-24 at 8.06.41 AM.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/b64ca472-249c-496b-a91c-0561f7091bfc/39578f9d-2395-4c4e-ad1e-4c9fcced18ad/Screenshot_2024-09-24_at_8.06.41_AM.png)

When workers push that button, we’ll unassign them from the shift to make it available to other workers in the marketplace.

<aside>
⚠️

**Note for candidates**
The actual mechanics of the notification system are out of scope. Assume that we have an internal notification service that you can call which will immediately notify the given user and responds whether it was successful or not.

</aside>

When shifts get unassigned, we’ll also increase their pay rate: today all of our shifts are paid at a static rate of $25/hour, but for these “urgent” shifts we’ll pay $50/hour. While this is less than what workplaces pay us for this work ($30/hour), it is worth it to reduce workplace churn for this small number of shifts.

Urgent shifts with the increased pay rate will have a special designation on the app so that workers are immediately aware of the heightened workplace need and additional pay opportunities.

![Screenshot 2024-09-24 at 8.31.00 AM.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/b64ca472-249c-496b-a91c-0561f7091bfc/5afcd88a-70a5-4736-a31c-d0c6352448cc/Screenshot_2024-09-24_at_8.31.00_AM.png)

## Appendix

### Abandoned Ideas

- We originally planned to automatically detect whether workers were making progress towards their shift, but the Martian GPS system has been out of commission for a few months, so we’re putting automatic detection on hold for now.
