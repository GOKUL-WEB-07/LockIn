import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

async function database() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    `);
  const migrations = await readdir(new URL("../supabase/migrations/", import.meta.url));
  for (const file of migrations.filter((name) => name.endsWith(".sql")).sort()) {
    const sql = await readFile(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
      "utf8",
    );
    await db.exec(sql);
  }
  await db.exec("grant usage on schema auth to authenticated;");
  await db.exec(`insert into auth.users(id) values ('${userA}'),('${userB}');`);
  return db;
}

async function as(db, user, sql, params) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user,
  ]);
  return db.query(sql, params);
}

test("authenticated users can manage drafts, start parallel programs, and save settings", async () => {
  const db = await database();
  try {
    await db.exec("set role authenticated");
    await as(db, userA, "select public.update_profile('Release tester',true)");
    await as(db, userA, "select public.set_notification_preferences(true,false,true,false)");
    const custom = (await as(db, userA, "select public.create_challenge('Draft','','Asia/Kolkata') as id")).rows[0].id;
    await assert.rejects(as(db, userA, "select public.start_challenge($1)", [custom]));
    const habit = (await as(db, userA, "select public.add_draft_habit($1,'Read',null) as id", [custom])).rows[0].id;
    await as(db, userA, "select public.update_draft_habit($1,'Read ten pages','08:00')", [habit]);
    const removed = (await as(db, userA, "select public.add_draft_habit($1,'Remove me',null) as id", [custom])).rows[0].id;
    await as(db, userA, "select public.delete_draft_habit($1)", [removed]);
    await as(db, userA, "select public.start_challenge($1)", [custom]);
    await assert.rejects(as(db, userA, "select public.delete_draft_habit($1)", [habit]));
    const program = (await as(db, userA, "select public.start_prebuilt('e1d19ba7-321c-4e54-9f19-8b615e42b001','Pacific/Kiritimati') as id")).rows[0].id;
    const active = await db.query("select id from public.challenges where status='ACTIVE'");
    assert.equal(active.rows.length, 2);
    const copied = await db.query("select locked from public.habits where challenge_id=$1", [program]);
    assert.equal(copied.rows.length, 4);
    assert.ok(copied.rows.every((row) => row.locked));
    const date = await db.query("select start_date = (now() at time zone 'Pacific/Kiritimati')::date as correct from public.challenge_attempts where challenge_id=$1", [program]);
    assert.equal(date.rows[0].correct, true);
    await as(db, userA, "select public.complete_habit($1)", [habit]);
    const profile = await db.query("select display_name,onboarding_completed,super_coins from public.profiles");
    assert.deepEqual(profile.rows, [{ display_name: "Release tester", onboarding_completed: true, super_coins: 6 }]);
    const prefs = await db.query("select habit_reminders_enabled,daily_result_enabled from public.notification_preferences");
    assert.deepEqual(prefs.rows, [{ habit_reminders_enabled: true, daily_result_enabled: false }]);
    await as(db, userB, "select 1");
    for (const table of ["challenges", "habits", "challenge_attempts", "daily_progress", "habit_completions", "reward_events", "user_items"]) {
      assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0, table);
    }
    await assert.rejects(db.query("select public.complete_habit($1)", [habit]));
    await assert.rejects(db.query("select public.update_draft_challenge($1,'Intrusion','')", [custom]));
  } finally {
    await db.close();
  }
});

test("anonymous roles cannot read private data or execute mutations", async () => {
  const db = await database();
  try {
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.profiles"));
    await assert.rejects(db.query("select public.create_challenge('Forged','','UTC')"));
    await assert.rejects(db.query("select public.update_profile('Forged',true)"));
    await assert.rejects(db.query("select public.reconcile_due_challenges()"));
  } finally {
    await db.close();
  }
});

test("migration and core rules", async () => {
  const db = await database();
  try {
    const created = await as(
      db,
      userA,
      "select public.create_challenge('Morning Routine','A daily start','UTC') as id",
    );
    const challenge = created.rows[0].id;
    for (let i = 1; i <= 4; i++)
      await as(db, userA, "select public.add_draft_habit($1,$2,null)", [
        challenge,
        `Habit ${i}`,
      ]);
    await as(db, userA, "select public.start_challenge($1)", [challenge]);
    const locked = await as(
      db,
      userA,
      "select locked from public.habits where challenge_id=$1",
      [challenge],
    );
    assert.equal(locked.rows.length, 4);
    assert.ok(locked.rows.every((row) => row.locked));
    await assert.rejects(
      as(db, userA, "select public.add_draft_habit($1,$2,null)", [
        challenge,
        "Extra",
      ]),
    );
    await assert.rejects(
      as(db, userB, "select public.reconcile_challenge($1)", [challenge]),
    );
    const another = await as(
      db,
      userA,
      "select public.create_challenge('Second','','UTC') as id",
    );
    const second = another.rows[0].id;
    await as(db, userA, "select public.add_draft_habit($1,$2,null)", [
      second,
      "A habit",
    ]);
    await assert.rejects(
      as(db, userA, "select public.start_challenge($1)", [second]),
    );

    const habits = await as(
      db,
      userA,
      "select id from public.habits where challenge_id=$1 order by sort_order",
      [challenge],
    );
    for (const habit of habits.rows.slice(0, 3))
      await as(db, userA, "select public.complete_habit($1)", [habit.id]);
    await as(db, userA, "select public.complete_habit($1)", [
      habits.rows[0].id,
    ]);
    const rewards = await as(
      db,
      userA,
      "select count(*)::int as n from public.reward_events where event_type='HABIT'",
    );
    assert.equal(rewards.rows[0].n, 3);
    const progress = await as(
      db,
      userA,
      "select completed_habits, completion_percentage from public.daily_progress where challenge_id=$1",
      [challenge],
    );
    assert.equal(progress.rows[0].completed_habits, 3);
    assert.equal(Number(progress.rows[0].completion_percentage), 75);
    const immediate = await as(
      db,
      userA,
      "select successful_days,current_streak from public.challenge_attempts where challenge_id=$1",
      [challenge],
    );
    assert.deepEqual(immediate.rows[0], {
      successful_days: 1,
      current_streak: 1,
    });
    await as(db, userA, "select public.complete_habit($1)", [
      habits.rows[3].id,
    ]);
    await as(
      db,
      userA,
      "update public.challenge_attempts set start_date=current_date-1 where challenge_id=$1",
      [challenge],
    );
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    const processed = await db.query(
      "select public.reconcile_due_challenges() as count",
    );
    assert.equal(processed.rows[0].count, 1);
    const after = await as(
      db,
      userA,
      "select successful_days,current_streak,current_day from public.challenge_attempts where challenge_id=$1",
      [challenge],
    );
    assert.deepEqual(after.rows[0], {
      successful_days: 1,
      current_streak: 1,
      current_day: 2,
    });
    const dayRewards = await as(
      db,
      userA,
      "select count(*)::int as n from public.reward_events where event_type='DAY'",
    );
    assert.equal(dayRewards.rows[0].n, 1);
  } finally {
    await db.close();
  }
});

test("two consecutive misses preserve the old attempt and create a new one", async () => {
  const db = await database();
  try {
    const challenge = (
      await as(
        db,
        userA,
        "select public.create_challenge('Reset case','','UTC') as id",
      )
    ).rows[0].id;
    await as(db, userA, "select public.add_draft_habit($1,$2,null)", [
      challenge,
      "Show up",
    ]);
    await as(db, userA, "select public.start_challenge($1)", [challenge]);
    await as(
      db,
      userA,
      "update public.challenge_attempts set start_date=current_date-2 where challenge_id=$1",
      [challenge],
    );
    await as(db, userA, "select public.reconcile_challenge($1)", [challenge]);
    const attempts = await as(
      db,
      userA,
      "select attempt_number,status,current_day from public.challenge_attempts where challenge_id=$1 order by attempt_number",
      [challenge],
    );
    assert.deepEqual(
      attempts.rows.map((row) => [
        row.attempt_number,
        row.status,
        row.current_day,
      ]),
      [
        [1, "RESET", 2],
        [2, "ACTIVE", 1],
      ],
    );
    const old = await as(
      db,
      userA,
      "select status from public.daily_progress where attempt_id=(select id from public.challenge_attempts where challenge_id=$1 and attempt_number=1) order by day_number",
      [challenge],
    );
    assert.deepEqual(
      old.rows.map((row) => row.status),
      ["MISSED", "MISSED"],
    );
  } finally {
    await db.close();
  }
});

test("two of four misses, three of four succeeds, and a later miss does not reset", async () => {
  const db = await database();
  try {
    const challenge = (
      await as(
        db,
        userA,
        "select public.create_challenge('Threshold case','','UTC') as id",
      )
    ).rows[0].id;
    const habits = [];
    for (let i = 1; i <= 4; i++)
      habits.push(
        (
          await as(
            db,
            userA,
            "select public.add_draft_habit($1,$2,null) as id",
            [challenge, `Habit ${i}`],
          )
        ).rows[0].id,
      );
    const attempt = (
      await as(db, userA, "select public.start_challenge($1) as id", [
        challenge,
      ])
    ).rows[0].id;
    await as(
      db,
      userA,
      "update public.challenge_attempts set start_date=current_date-3 where id=$1",
      [attempt],
    );
    for (const [day, count] of [
      [1, 2],
      [2, 3],
    ]) {
      for (const habit of habits.slice(0, count))
        await as(
          db,
          userA,
          `insert into public.habit_completions(habit_id,attempt_id,challenge_id,user_id,day_number,completion_date)
         values ($1,$2,$3,$4,$5,current_date-3+($5-1))`,
          [habit, attempt, challenge, userA, day],
        );
    }
    await as(db, userA, "select public.reconcile_challenge($1)", [challenge]);
    const days = await as(
      db,
      userA,
      "select day_number,status,completion_percentage from public.daily_progress where attempt_id=$1 order by day_number",
      [attempt],
    );
    assert.deepEqual(
      days.rows.map((row) => [
        row.day_number,
        row.status,
        Number(row.completion_percentage),
      ]),
      [
        [1, "MISSED", 50],
        [2, "COMPLETED", 75],
        [3, "MISSED", 0],
      ],
    );
    const state = await as(
      db,
      userA,
      "select status,successful_days,current_streak,consecutive_misses from public.challenge_attempts where id=$1",
      [attempt],
    );
    assert.deepEqual(state.rows[0], {
      status: "ACTIVE",
      successful_days: 1,
      current_streak: 0,
      consecutive_misses: 1,
    });
  } finally {
    await db.close();
  }
});

test("day 21 finishes at 17 successful days and retries after 16", async () => {
  const db = await database();
  try {
    for (const [name, misses, expected] of [
      ["Pass case", [3, 8, 13, 18], "COMPLETED"],
      ["Fail case", [3, 7, 11, 15, 19], "UNSUCCESSFUL"],
    ]) {
      const challenge = (
        await as(db, userA, "select public.create_challenge($1,$2,$3) as id", [
          name,
          "",
          "UTC",
        ])
      ).rows[0].id;
      const habit = (
        await as(db, userA, "select public.add_draft_habit($1,$2,null) as id", [
          challenge,
          "Practice",
        ])
      ).rows[0].id;
      const attempt = (
        await as(db, userA, "select public.start_challenge($1) as id", [
          challenge,
        ])
      ).rows[0].id;
      await as(
        db,
        userA,
        "update public.challenge_attempts set start_date=current_date-21 where id=$1",
        [attempt],
      );
      for (let day = 1; day <= 21; day++) {
        if (misses.includes(day)) continue;
        await as(
          db,
          userA,
          `insert into public.habit_completions(habit_id,attempt_id,challenge_id,user_id,day_number,completion_date)
          values ($1,$2,$3,$4,$5,current_date-21+($5-1))`,
          [habit, attempt, challenge, userA, day],
        );
      }
      await as(db, userA, "select public.reconcile_challenge($1)", [challenge]);
      const state = await as(
        db,
        userA,
        "select status,active_attempt_id from public.challenges where id=$1",
        [challenge],
      );
      assert.equal(state.rows[0].status, expected);
      assert.equal(state.rows[0].active_attempt_id, null);
      const outcome = await as(
        db,
        userA,
        "select status,successful_days from public.challenge_attempts where id=$1",
        [attempt],
      );
      assert.equal(outcome.rows[0].status, expected);
      assert.equal(outcome.rows[0].successful_days, 21 - misses.length);
      if (expected === "UNSUCCESSFUL") {
        await as(db, userA, "select public.retry_challenge($1)", [challenge]);
        const history = await as(
          db,
          userA,
          "select attempt_number,status from public.challenge_attempts where challenge_id=$1 order by attempt_number",
          [challenge],
        );
        assert.deepEqual(
          history.rows.map((row) => [row.attempt_number, row.status]),
          [
            [1, "UNSUCCESSFUL"],
            [2, "ACTIVE"],
          ],
        );
      }
    }
  } finally {
    await db.close();
  }
});

test("RLS hides another user and blocks direct mutations", async () => {
  const db = await database();
  try {
    const challenge = (
      await as(
        db,
        userA,
        "select public.create_challenge('Private','','UTC') as id",
      )
    ).rows[0].id;
    const habit = (
      await as(db, userA, "select public.add_draft_habit($1,$2,null) as id", [
        challenge,
        "Private habit",
      ])
    ).rows[0].id;
    await as(db, userA, "select public.start_challenge($1)", [challenge]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      userB,
    ]);
    await db.exec("set role authenticated");
    try {
      const visible = await db.query(
        "select id from public.challenges where id=$1",
        [challenge],
      );
      assert.equal(visible.rows.length, 0);
      await assert.rejects(
        db.query("update public.profiles set super_coins=999 where id=$1", [
          userB,
        ]),
      );
      await assert.rejects(
        db.query("select public.reconcile_due_challenges()"),
      );
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
        userA,
      ]);
      await assert.rejects(
        db.query("update public.habits set name=$1 where id=$2", [
          "Changed",
          habit,
        ]),
      );
      await assert.rejects(
        db.query("select public.grant_reward($1,$2,$3,$4,$5)", [
          userA,
          challenge,
          null,
          "DAY",
          "forged",
        ]),
      );
    } finally {
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});

test("shop uses server price, blocks unowned theme, and debits only once", async () => {
  const db = await database();
  try {
    const item = "b4afebc5-6db5-4a4b-a343-2b0c1cbda001";
    await assert.rejects(
      as(db, userA, "select public.purchase_shop_item($1)", [item]),
    );
    await assert.rejects(as(db, userA, "select public.set_theme($1)", [item]));
    const challenge = (
      await as(
        db,
        userA,
        "select public.create_challenge('Coins','','UTC') as id",
      )
    ).rows[0].id;
    const habit = (
      await as(db, userA, "select public.add_draft_habit($1,$2,null) as id", [
        challenge,
        "One",
      ])
    ).rows[0].id;
    const attempt = (
      await as(db, userA, "select public.start_challenge($1) as id", [
        challenge,
      ])
    ).rows[0].id;
    for (let day = 1; day <= 21; day++)
      await as(db, userA, "select public.grant_reward($1,$2,$3,$4,$5)", [
        userA,
        challenge,
        attempt,
        "DAY",
        `test-day:${day}`,
      ]);
    await as(db, userA, "select public.purchase_shop_item($1)", [item]);
    await as(db, userA, "select public.set_theme($1)", [item]);
    await assert.rejects(
      as(db, userA, "select public.purchase_shop_item($1)", [item]),
    );
    const balance = await as(
      db,
      userA,
      "select super_coins,selected_theme from public.profiles where id=$1",
      [userA],
    );
    assert.equal(balance.rows[0].super_coins, 75);
    assert.equal(balance.rows[0].selected_theme, item);
    assert.ok(habit);
  } finally {
    await db.close();
  }
});

test("cosmetics require ownership and equip only in their category", async () => {
  const db = await database();
  try {
    const badge = "b4afebc5-6db5-4a4b-a343-2b0c1cbda007";
    await assert.rejects(as(db, userA, "select public.set_cosmetic($1,'PROFILE')", [badge]));
    await db.query("update public.profiles set super_coins = 100 where id = $1", [userA]);
    await as(db, userA, "select public.purchase_shop_item($1)", [badge]);
    await assert.rejects(as(db, userB, "select public.set_cosmetic($1,'PROFILE')", [badge]));
    await assert.rejects(as(db, userA, "select public.set_cosmetic($1,'INTERFACE')", [badge]));
    await as(db, userA, "select public.set_cosmetic($1,'PROFILE')", [badge]);
    const selected = await as(db, userA, "select selected_profile_item_id, selected_interface_item_id from public.profiles where id=$1", [userA]);
    assert.equal(selected.rows[0].selected_profile_item_id, badge);
    assert.equal(selected.rows[0].selected_interface_item_id, null);
    const effect = "b4afebc5-6db5-4a4b-a343-2b0c1cbda009";
    await as(db, userA, "select public.purchase_shop_item($1)", [effect]);
    await as(db, userA, "select public.set_cosmetic($1,'INTERFACE')", [effect]);
    await as(db, userA, "select public.set_cosmetic(null,'PROFILE')");
    const final = await as(db, userA, "select selected_profile_item_id, selected_interface_item_id, super_coins from public.profiles where id=$1", [userA]);
    assert.equal(final.rows[0].selected_profile_item_id, null);
    assert.equal(final.rows[0].selected_interface_item_id, effect);
    assert.equal(final.rows[0].super_coins, 100 - 20 - 35);
  } finally {
    await db.close();
  }
});
