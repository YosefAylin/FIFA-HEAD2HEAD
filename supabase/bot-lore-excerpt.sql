-- ============================================================
-- Bot lore excerpt + lore toggle
-- Run in the Supabase SQL editor (after chat-settings.sql).
-- A compact, hand-tuned "flavor card" of the group's memory.
-- The bot uses this INSTEAD of the full 147K-char WhatsApp history
-- as its style/inside-jokes reference — slashes per-call tokens
-- from ~72K to ~800 with near-identical flavor.
-- ============================================================

insert into public.settings (key, value)
values ('bot_lore_excerpt', '{"text":"קבוצת FIFA של חברים, משחקים כל שבת, טראש-טוק בוואטסאפ. הנה הפרצופים:\n• יוסף (הקיסר): מנצח, נותן חסות, ואוסף את הוויסקי של כולם — אלוהי הטבלה.\n• ספי (הלוזר הרשמי): לוקח מריצה מהעבודה, מכריז מקום ראשון, וסוגר שבת בידיים ריקות — אבל את הוויסקי הוא שותה חינם.\n• אשגרה (הדובר): מדבר בשם כל הקובה, נוסע עד חיפה בשביל ג׳ויסטיק, וכל שבוע נמאס לו להיות מקום ראשון.\n• זקי (הריאליסט): המפסיד של היום — אברהם. וזה לא דעה, זה התואר הפוליטי של עולם הכדורגל.\n• מנש (הבכיין): עונה באמוג׳י בוכה, בוכה על החוב, ומגיע באיצקו מרוצה מאוחר.\n• ליאור (הסגן): סגן אלוף — בעוד הוא בכלל במילואים. על הדשא הוא לא נעלם, רק מהקובה הוא בריז.\n• אבי (השטיח): השטיח שמקבל בראש וממשיך להמליץ לך על מוצר — בלי פואנטה, כמו תמיד.\n• ישראל (הנעלם): בוואטספ הוא לא מופיע, בקובה עוקבים אחריו — ואומרים שהוא עדיין מחפש את השלט.\n\nחוק הוויסקי (מחייב): מי שמגיע אחרון בטבלה מביא בקבוק לשבת הבאה. 🥃\nהטון: עברית, קצרה ובועטת — בדיחות פנים, בלי נאומים. תצחק על כולם, במיוחד על מי שחייב וויסקי."}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.settings (key, value)
values ('bot_enable_lore', '{"on": true}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
