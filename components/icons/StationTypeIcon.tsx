import type { StationType } from "@/lib/schemas";
import { memo } from "react";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * Laba's own TV and radio glyphs, drawn on a 24 grid. The tab bar PNGs are
 * rendered from the same paths (assets/images/tabs/svg), so keep them in sync.
 */
const TV_SCREEN =
  "M6.75 5.75H17.25A4 4 0 0 1 21.25 9.75V14.75A4 4 0 0 1 17.25 18.75H6.75A4 4 0 0 1 2.75 14.75V9.75A4 4 0 0 1 6.75 5.75Z";
const TV_PLAY =
  "M10.25 10.3Q10.25 9.4 11.05 9.85L14.8 11.85Q15.5 12.25 14.8 12.65L11.05 14.65Q10.25 15.1 10.25 14.2Z";
const TV_ANTENNA = "M8.25 2.25L12 5.5L15.75 2.25M8.75 21.5H15.25";

const RADIO_BODY =
  "M6.75 8.25H17.25A4 4 0 0 1 21.25 12.25V16.75A4 4 0 0 1 17.25 20.75H6.75A4 4 0 0 1 2.75 16.75V12.25A4 4 0 0 1 6.75 8.25Z";
const RADIO_HANDLE = "M6.5 8.25L16.75 3.25";
const RADIO_SPEAKER = "M11.5 14.5A2.75 2.75 0 1 0 6 14.5A2.75 2.75 0 1 0 11.5 14.5Z";
const RADIO_SPEAKER_HOLE = "M12.4 14.5A3.65 3.65 0 1 0 5.1 14.5A3.65 3.65 0 1 0 12.4 14.5Z";
const RADIO_DIAL =
  "M14.75 12.25H17.5A.75 .75 0 0 1 17.5 13.75H14.75A.75 .75 0 0 1 14.75 12.25ZM14.75 15.25H17.5A.75 .75 0 0 1 17.5 16.75H14.75A.75 .75 0 0 1 14.75 15.25Z";

interface IconProps {
  size?: number;
  color?: string;
  /** Solid variant, used for selected and emphasised states. */
  filled?: boolean;
  strokeWidth?: number;
}

export const TvIcon = memo(function TvIcon({
  size = 20,
  color = "#FFFFFF",
  filled = false,
  strokeWidth = 1.75,
}: IconProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={TV_ANTENNA} fill="none" {...stroke} />
      <Path d={TV_SCREEN} fill="none" {...stroke} />
      {filled ? (
        <Path d={`${TV_SCREEN}${TV_PLAY}`} fill={color} fillRule="evenodd" />
      ) : (
        <Path d={TV_PLAY} fill={color} />
      )}
    </Svg>
  );
});

export const RadioIcon = memo(function RadioIcon({
  size = 20,
  color = "#FFFFFF",
  filled = false,
  strokeWidth = 1.75,
}: IconProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={RADIO_HANDLE} fill="none" {...stroke} />
      <Path d={RADIO_BODY} fill="none" {...stroke} />
      {filled ? (
        <>
          <Path d={`${RADIO_BODY}${RADIO_SPEAKER_HOLE}${RADIO_DIAL}`} fill={color} fillRule="evenodd" />
          <Circle cx={8.75} cy={14.5} r={1.9} fill={color} />
        </>
      ) : (
        <>
          <Path d={RADIO_SPEAKER} fill="none" {...stroke} />
          <Path d={RADIO_DIAL} fill={color} />
        </>
      )}
    </Svg>
  );
});

export function StationTypeIcon({ type, ...props }: IconProps & { type: StationType }) {
  return type === "tv" ? <TvIcon {...props} /> : <RadioIcon {...props} />;
}
