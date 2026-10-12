# 搭子日程

几个人各自有局，日程对不上。搭子日程让朋友加入同一个搭子组，各自记下被占用的时间，再在组里约一个行程。行程一旦有人参加或可能参加，其他搭子组只能看到这个人忙碌，看不到另一个组的标题和地点。

## 和现有工具的差别

- [Howbout](https://howbout.app/groups) 最接近：好友组、看谁有空、直接创建计划。它是 App，占用主要来自同步外部日历，也没有「这个行程属于哪一个搭子组」这一层。
- [TimeTree](https://timetreeapp.com/) 和 [记得日历](https://www.rmbr.cn/) 是一组一个共享日历。A 组的行程不会自动变成 B 组里的「此人忙碌」。
- When2meet、Doodle、Rallly、调整君是一次性投票。没有长期账号，也没有跨组占用。

这个网站拿走 Howbout 的「建组 → 看空闲 → 锁定行程」，用 TimeTree 的多组，再用 Google 日历式的 free/busy 做跨组。

## 可见性

- 本人始终看到自己的占用标题。行程的标题和地点只在这个行程所属的搭子组里显示。
- 同一个搭子组看到本组行程的标题、地点和谁参加。个人占用默认也能看到标题。
- 个人占用可以勾选「只显示忙碌」，这样其他成员看不到标题。
- 其他搭子组里，参加显示「忙碌」，可能参加显示「可能忙」，你自己看也一样。不参加不会占用你。
- 不在同一个组的人什么都看不到。

约行程的人默认参加，可以改成不参加。时间按北京时间。

## 本地运行

需要 Node.js 22+ 和 Docker。

```bash
docker compose up -d
cp .env.example .env.local
```

把 `.env.local` 里的 `BETTER_AUTH_SECRET` 换成 `openssl rand -base64 32` 的结果，然后：

```bash
npm install
npm run db:push
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。`127.0.0.1:3000` 也可以登录。数据库默认是 `postgres://schedule:schedule@localhost:5432/schedule`。

```bash
npm test
```

## 第一版不做

外部日历同步、群聊、推送、重复日程、投票网格、微信登录、原生 App。
