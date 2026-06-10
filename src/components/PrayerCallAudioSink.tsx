import { StreamVideo, StreamCall, SpeakerLayout } from '@stream-io/video-react-sdk'

export default function PrayerCallAudioSink({ client, call }: { client: any; call: any }) {
  if (!client || !call) return null
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <SpeakerLayout />
        </StreamCall>
      </StreamVideo>
    </div>
  )
}
