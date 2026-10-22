import { Composition } from "remotion";
import { Promo, DURATION } from "./Promo";

export const Root = () => (
  <>
    <Composition id="Promo-en" component={Promo} defaultProps={{ lang: "en" as const }} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
    <Composition id="Promo-es" component={Promo} defaultProps={{ lang: "es" as const }} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
  </>
);
