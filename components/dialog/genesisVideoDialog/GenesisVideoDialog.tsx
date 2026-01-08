"use client";

// region Imports
import { useEffect, useState } from "react";
import { KAspectRatio, KDialog, KDialogContent, KDialogHeader, KDialogTitle } from "kku-ui";
import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
// endregion

// region Types & Constants
interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void;
}

const VIDEO_POSTER_URL = 'https://image-store-one.vercel.app/image/l12hjd.webp';
const VIDEO_URL = 'https://image-store-one.vercel.app/video/bitcoin_genesis.mp4';
const VIDEO_SUBTITLE_URL = 'https://image-store-one.vercel.app/video/bitcoin_genesis.srt';
const BREAKPOINT_WIDTH = 524;
// endregion

export default function GenesisVideoDialog({ open, setOpen }: ModalTypes) {
  // region Hooks
  const [vttUrl, setVttUrl] = useState<string>('');
  const [dialogSize, setDialogSize] = useState<'sm' | 'md'>('sm');
  // endregion

  // region Functions
  const handleResize = () => {
    setDialogSize(window.innerWidth > BREAKPOINT_WIDTH ? 'md' : 'sm');
  };

  const fetchAndConvertSubtitle = async (): Promise<Blob | undefined> => {
    try {
      const response = await fetch(VIDEO_SUBTITLE_URL);
      const srtText = await response.text();

      // SRT 포맷의 쉼표(,)를 VTT용 마침표(.)로 변환
      const vttText = 'WEBVTT\n\n' + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      return new Blob([vttText], { type: 'text/vtt' });
    } catch (error) {
      console.error('Subtitle conversion failed:', error);
    }
  };
  // endregion

  // region Effects
  // 다이얼로그 반응형 사이즈 처리
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 자막 데이터 로드 및 URL 정리
  useEffect(() => {
    if (!open) return;

    let objectUrl = '';

    fetchAndConvertSubtitle().then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setVttUrl(objectUrl);
      }
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setVttUrl('');
    };
  }, [open]);
  // endregion

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size={dialogSize}>
      <KDialogContent className="p-0 overflow-hidden text-[0]">
        <KDialogHeader className="hidden">
          <KDialogTitle>Genesis Block</KDialogTitle>
        </KDialogHeader>

        {/* region Video Player */}
        <KAspectRatio ratio={16 / 9}>
          <MediaPlayer
            title="Bitcoin The beginning"
            src={VIDEO_URL}
            className="w-full h-full bg-black"
            viewType="video"
            playsInline
            crossOrigin="anonymous"
          >
            <MediaProvider>
              <Poster
                src={VIDEO_POSTER_URL}
                alt="Video Thumbnail"
                className="absolute inset-0 block h-full w-full object-cover opacity-0 transition-opacity data-[visible]:opacity-100"
              />
              {vttUrl && (
                <Track
                  src={vttUrl}
                  label="한국어"
                  kind="subtitles"
                  lang="ko-KR"
                  type="vtt"
                  default
                />
              )}
            </MediaProvider>
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
        </KAspectRatio>
        {/* endregion */}
      </KDialogContent>
    </KDialog>
  );
}