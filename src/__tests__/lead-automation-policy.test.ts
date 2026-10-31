import {describe,it,expect} from 'vitest';
import {OWNER_REPORT_EMAIL,REPORT_HOUR,previousLisbonDay,isReportHour,withinReplyWindow,dailyMoney} from '@/lib/lead-assistant/policy';
import {lisbonDayBounds} from '@/lib/lead-assistant/time';
describe('Owner lead automation rules',()=>{
 it('uses the owner selected email',()=>expect(OWNER_REPORT_EMAIL).toBe('Yesexperiences@gmail.com'));
 it('runs at 09:00 Lisbon winter and summer',()=>{expect(REPORT_HOUR).toBe(9);expect(isReportHour(new Date('2026-10-31T09:00:00Z'))).toBe(true);expect(isReportHour(new Date('2026-07-01T08:00:00Z'))).toBe(true);expect(isReportHour(new Date('2026-07-01T09:00:00Z'))).toBe(false);});
 it('reports the previous Lisbon date',()=>expect(previousLisbonDay(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-01'));
 it('handles 23 and 25 hour report days',()=>{const spring=lisbonDayBounds('2026-03-29');const autumn=lisbonDayBounds('2026-10-25');expect((Date.parse(spring.end)-Date.parse(spring.start))/3600000).toBe(23);expect((Date.parse(autumn.end)-Date.parse(autumn.start))/3600000).toBe(25);});
 it('quotes only approved live money and excludes vouchers and sandbox',()=>{expect(dailyMoney([{id:'a',kind:'payment',environment:'live',amount:36600,currency:'eur'},{id:'a',kind:'payment',environment:'live',amount:36600,currency:'eur'},{id:'b',kind:'refund',environment:'live',amount:1000,currency:'eur'},{id:'v',kind:'voucher',environment:'live',amount:90000,currency:'eur'},{id:'t',kind:'payment',environment:'sandbox',amount:50000,currency:'eur'}])).toEqual({sales:1,netMinorUnits:{EUR:35600}});});
 it('never sends free-form outside the customer window',()=>{expect(withinReplyWindow('2026-10-30T09:00:00Z',new Date('2026-10-31T09:00:00Z'))).toBe(false);expect(withinReplyWindow('2026-10-31T08:00:00Z',new Date('2026-10-31T09:00:00Z'))).toBe(true);});
});
