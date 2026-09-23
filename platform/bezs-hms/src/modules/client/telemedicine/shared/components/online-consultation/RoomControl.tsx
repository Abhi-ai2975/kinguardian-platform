/**
 * RoomControl — LiveKit video grid + control bar for a virtual consultation room.
 *
 * Layer: client / telemedicine / shared / components / online-consultation
 *
 * Shared between PatientConsult and DoctorConsult. Renders all participant
 * video tiles in a grid with a floating frosted-glass control bar.
 * Must be rendered inside a <LiveKitRoom> provider.
 */

"use client";

import {
  ConnectionStateToast,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

/**
 * Renders participant video tiles in a LiveKit grid with an overlay control bar.
 * Must be placed inside a <LiveKitRoom> context.
 */
export function RoomControlUI() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full relative rounded-xl overflow-hidden bg-zinc-950 border border-border">
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
      <ConnectionStateToast />

      {/* Frosted glass control bar pinned to the bottom centre */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/50 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10 shadow-xl">
          <ControlBar
            variation="minimal"
            controls={{ screenShare: false, chat: false }}
          />
        </div>
      </div>
    </div>
  );
}
