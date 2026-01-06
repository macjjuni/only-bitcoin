'use client'

// #region Imports
import { useState, useEffect } from 'react';
import { KAspectRatio, KDialog, KDialogContent, KDialogHeader, KDialogTitle } from 'kku-ui';
import { MediaPlayer, MediaProvider, Poster, Track } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
// #endregion

// #region Types & Constants
interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void;
}

const VIDEO_POSTER_URL = 'https://image-store-one.vercel.app/image/l12hjd.webp';
const VIDEO_URL = 'https://image-store-one.vercel.app/video/bitcoin_genesis.mp4';
const VIDEO_SUBTITLE_URL = 'https://image-store-one.vercel.app/video/bitcoin_genesis.srt';
// #endregion

export default function GenesisVideoDialog({ open, setOpen }: ModalTypes) {
  // #region Subtitle Logic (SRT to VTT conversion)
  const [vttUrl, setVttUrl] = useState<string>('');

  useEffect(() => {
    if (!open) return;

    const loadSubtitle = async () => {
      try {
        const response = await fetch(VIDEO_SUBTITLE_URL);
        const srtText = await response.text();
        const vttText = 'WEBVTT\n\n' + srtText.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
        const blob = new Blob([vttText], { type: 'text/vtt' });
        setVttUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error(e);
      }
    };

    loadSubtitle();

    // Cleanup: 메모리 누수 방지를 위한 URL 해제
    return () => {
      if (vttUrl) URL.revokeObjectURL(vttUrl);
    };
  }, [open]);
  // #endregion

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogContent className="text-[0] p-0 overflow-hidden">
        <KDialogHeader className="hidden">
          <KDialogTitle>
            <strong>Genesis Block</strong>
          </KDialogTitle>
        </KDialogHeader>

        {/* #region Video Player */}
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
              <Poster src={VIDEO_POSTER_URL}
                      alt="Bitcoin Genesis Video Thumbnail"
                      className="absolute inset-0 block h-full w-full object-cover opacity-0 transition-opacity data-[visible]:opacity-100"/>
              {vttUrl && (<Track src={vttUrl} label="한국어" kind="subtitles" type="vtt" default />)}
            </MediaProvider>
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
        </KAspectRatio>
        {/* #endregion */}
      </KDialogContent>
    </KDialog>
  );
}