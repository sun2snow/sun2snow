export const accountIcons = {
  x: '/accounts/x.png',
  qq: '/accounts/qq.ico',
  github: '/accounts/github.svg',
  luogu: '/accounts/luogu.ico',
  codeforces: '/accounts/codeforces.png',
  atcoder: '/accounts/atcoder.png',
} as const;

interface Account {
  name: string;
  icon: keyof typeof accountIcons;
  number?: string;
  links: { href: string; label?: string }[];
}

export const accountGroups: { title: string; accounts: Account[] }[] = [
  {
    title: 'Social & contact',
    accounts: [
      { name: 'X', icon: 'x', links: [{ href: 'https://x.com/sunsnow502424' }] },
      { name: 'QQ', icon: 'qq', number: '77017505', links: [] },
      { name: 'GitHub', icon: 'github', links: [{ href: 'https://github.com/sun2snow' }] },
    ],
  },
  {
    title: 'Competitive programming',
    accounts: [
      { name: 'Luogu', icon: 'luogu', links: [
        { label: '1', href: 'https://www.luogu.com.cn/user/726139' },
        { label: '2', href: 'https://www.luogu.com.cn/user/1041814' },
      ] },
      { name: 'Codeforces', icon: 'codeforces', links: [{ href: 'https://codeforces.com/profile/sun2snow' }] },
      { name: 'AtCoder', icon: 'atcoder', links: [{ href: 'https://atcoder.jp/users/OIer_wst' }] },
    ],
  },
];
