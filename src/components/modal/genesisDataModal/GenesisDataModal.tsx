/* eslint-disable react/no-array-index-key */
import React, { memo, useState, useMemo } from "react";
import { KModal } from "kku-ui";
import { GENESIS_BLOCK_RAW_DATA } from "@/shared/constants/block";
import "./GenesisDataModal.scss";

interface ModalTypes {
  isOpen: boolean;
  onClose: () => void;
}

const parseHexDump = (dump: string) => {
  return dump.trim().split('\n').map((line, lineIdx) => {
    const cleanLine = line.trim();

    // 1. Offset
    const offset = cleanLine.substring(0, 8);
    const hexPart = cleanLine.substring(10, 60).trim();
    const hexBytes = hexPart.split(/\s+/).filter(Boolean);

    // 3. ASCII Parsing
    const asciiPart = cleanLine.slice(-hexBytes.length);

    return { id: lineIdx, offset, hexBytes, asciiPart };
  });
};

const GenesisDataModal = ({ isOpen, onClose }: ModalTypes) => {
  const [hovered, setHovered] = useState<{ line: number, idx: number } | null>(null);

  const parsedData = useMemo(() => parseHexDump(GENESIS_BLOCK_RAW_DATA), []);

  const handleEnter = (line: number, idx: number) => setHovered({ line, idx });
  const handleLeave = () => setHovered(null);

  return (
    <KModal isOpen={isOpen} onClose={onClose} overlayClosable className="genesis-block__modal">
      <KModal.Header>Genesis Block Raw Data</KModal.Header>
      <KModal.Content style={{ overflow: 'hidden' }}>
        <div className="hex-viewer">
          <div className="hex-viewer__header">
            <span className="col-offset">OFFSET</span>
            <span className="col-hex">HEX REPRESENTATION</span>
            <span className="col-ascii">ASCII</span>
          </div>

          <div className="hex-viewer__body">
            {parsedData.map((row, lineIdx) => (
              <div key={row.id} className="hex-row">
                <span className="hex-offset">{row.offset}</span>

                <div className="hex-bytes">
                  {/* Left Group (0-7) */}
                  <div className="hex-group">
                    {row.hexBytes.slice(0, 8).map((byte, idx) => (
                      <span
                        key={`${lineIdx}-L-${idx}`}
                        className={`byte ${hovered?.line === lineIdx && hovered?.idx === idx ? 'active' : ''} ${byte === '00' ? 'empty' : ''}`}
                        onMouseEnter={() => handleEnter(lineIdx, idx)}
                        onMouseLeave={handleLeave}
                      >
                        {byte}
                      </span>
                    ))}
                  </div>

                  {/* Right Group (8-15) */}
                  <div className="hex-group">
                    {row.hexBytes.slice(8, 16).map((byte, idx) => (
                      <span
                        key={`${lineIdx}-R-${idx}`}
                        className={`byte ${hovered?.line === lineIdx && hovered?.idx === idx + 8 ? 'active' : ''} ${byte === '00' ? 'empty' : ''}`}
                        onMouseEnter={() => handleEnter(lineIdx, idx + 8)}
                        onMouseLeave={handleLeave}
                      >
                        {byte}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hex-ascii">
                  {row.asciiPart.split('').map((char, idx) => {
                    const isActive = hovered?.line === lineIdx && hovered?.idx === idx;
                    const isMessage = lineIdx >= 8 && lineIdx <= 12;

                    return (
                      <span
                        key={`${lineIdx}-char-${idx}`}
                        className={`char ${isActive ? 'active' : ''} ${isMessage ? 'highlight-msg' : ''}`}
                        onMouseEnter={() => handleEnter(lineIdx, idx)}
                        onMouseLeave={handleLeave}
                      >
                         {char}
                       </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </KModal.Content>
    </KModal>
  );
};

const MemoizedGenesisDataModal = memo(GenesisDataModal);
MemoizedGenesisDataModal.displayName = 'GenesisDataModal';
GenesisDataModal.displayName = 'GenesisDataModal';

export default MemoizedGenesisDataModal;