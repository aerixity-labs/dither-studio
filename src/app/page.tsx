import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import Image from 'next/image'

import { DitherStudio } from '@/components/dither/dither-studio'
import { ReadoutField } from '@/components/dither/meta-readout'
import { SITE_DESCRIPTION, SITE_NAME } from '@/constants/site'
import { getStructuredData } from '@/lib/seo/structured-data'

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        /** Every value is a compile-time constant, and React would escape the quotes. */
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getStructuredData()) }}
      />

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:my-auto lg:h-[min(100dvh,900px)] lg:min-h-0 lg:overflow-hidden lg:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              <Image
                src="/logo.png"
                /** Decorative: the adjacent word mark already names the app. */
                alt=""
                width={28}
                height={28}
                priority
                quality={99}
                className="size-7"
              />
              {SITE_NAME}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">{SITE_DESCRIPTION}</p>
          </div>

          <ReadoutField
            icon={InformationCircleIcon}
            label="Files"
            value="never leave this device"
            isValueNumeric={false}
            className="w-fit px-0"
          />
        </header>

        <DitherStudio />
      </main>
    </>
  )
}
