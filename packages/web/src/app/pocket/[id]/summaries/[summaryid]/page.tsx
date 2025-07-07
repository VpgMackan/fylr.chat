'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/common/Button';
import ContentLayout from '@/components/layout/ContentLayout';
import SummaryCard from '@/components/features/summaries/SummaryCard';
import MarkdownComponent from '@/components/MarkdownComponents';

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; summaryid: string }>;
}) {
  const t = useTranslations('pages.summaries');
  const [id, setId] = useState<string | null>(null);
  const [summaryid, setSummaryid] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    params.then((res) => {
      setId(res.id);
      setSummaryid(res.summaryid);
    });
  }, [params]);

  return (
    <ContentLayout
      title="What is nine plus ten?"
      leadingTitleAccessory={
        <Icon icon="weui:back-outlined" onClick={() => router.back()} />
      }
      trailingHeaderActions={<Button text={t('editButton')} />}
      sidebarContent={
        <>
          <p className="text-xl">{t('summaryEpisodes')}</p>
          <hr className="mb-2" />

          <div className="flex flex-col gap-2">
            <SummaryCard
              fileName="What's ai's impact on the world?"
              fileType="pdf"
              selected={true}
            />
            <SummaryCard
              fileName="What's ai's impact on the world?"
              fileType="web"
            />
          </div>
        </>
      }
    >
      <MarkdownComponent
        text={`The fact that you still get “unsupported version (1.16) in file header” even with pg_restore 16.8 tells us that your dump was created by a PostgreSQL *newer* than 16.x. The little “PGDMP” magic is always at the start of a custom archive, but the human-readable \`PG_VERSION\` string is a bit further in. Let's pull it out:

\`\`\`bash
# pull in a few extra kilobytes, run strings, and grep for PG_VERSION:
head -c 4096 shh | strings | grep PG_VERSION
\`\`\`

You should see something like:

\`\`\`
PG_VERSION 17.2
\`\`\`

(or 18.x, etc.)  That tells you exactly which PG release produced the dump.

---

## 1. Identify the exact dump version  
\`\`\`bash
head -c 4096 shh | strings | grep PG_VERSION
\`\`\`
‑‑ if that still turns up nothing, try upping the byte count:

\`\`\`bash
head -c 16384 shh | strings | grep PG_VERSION
\`\`\`

---

## 2. Run a matching-version pg_restore  
Once you know it's, say, **17.2**:

- **Via Docker** (zero install friction):
  \`\`\`bash
  docker run --rm -v "$PWD":/backups \
    postgres:17.2 \
    pg_restore --list /backups/shh
  \`\`\`
  From there you can use the same container image to do all your extracts:
  \`\`\`bash
  # schema-only
  docker run --rm -v "$PWD":/backups postgres:17.2 \
    pg_restore --schema-only --file=/backups/ddl.sql /backups/shh

  # data-only
  docker run --rm -v "$PWD":/backups postgres:17.2 \
    pg_restore --data-only --file=/backups/data.sql /backups/shh
  \`\`\`

- **Via APT (PGDG repo)**  
  1. Add the PostgreSQL Apt repository if you haven't already:
     \`\`\`bash
     sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list'
     wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | sudo apt-key add -
     sudo apt-get update
     \`\`\`
  2. Install the client for the exact major version:
     \`\`\`bash
     sudo apt-get install postgresql-client-17
     \`\`\`
  3. Invoke it explicitly:
     \`\`\`bash
     /usr/lib/postgresql/17/bin/pg_restore --list shh
     \`\`\`

---

## 3. Once you have a compatible client, extract whatever you need  

- **List everything**  
  \`\`\`bash
  pg_restore --list shh > contents.txt
  \`\`\`
- **Schema only**  
  \`\`\`bash
  pg_restore --schema-only --file=ddl.sql shh
  \`\`\`
- **Data only**  
  \`\`\`bash
  pg_restore --data-only --file=data.sql shh
  \`\`\`
- **Single table**  
  \`\`\`bash
  pg_restore --table=public.my_table --file=one_table.sql shh
  \`\`\`
- **All-in-one SQL**  
  \`\`\`bash
  pg_restore --verbose --file=full_dump.sql shh
  \`\`\`
- **Direct restore**  
  \`\`\`bash
  createdb newdb
  pg_restore --no-owner --role=you --dbname=newdb shh
  \`\`\`

---

### Why this happens  
Custom-format dumps embed the producer's PG version in their header; the client will refuse to read archives from a *newer* engine. By pulling out the \`PG_VERSION\` line and then running that same-version (or newer) \`pg_restore\`, you'll be able to list, inspect and extract your data without any more “unsupported version” errors.`}
      />
    </ContentLayout>
  );
}
