/**
 * Pure state machine for the lesson audio player. Kept free of React and the
 * DOM so it can be unit-tested; `LessonPlayer` drives an <audio> element from
 * this state.
 *
 * `token` increments whenever playback should (re)start from the beginning of a
 * clip — even when `currentLine` is unchanged (e.g. replay). The component
 * watches it to know when to reload the audio source.
 */
export type PlayerMode = "idle" | "all" | "single";

export type PlayerState = {
  mode: PlayerMode;
  currentLine: number;
  playing: boolean;
  token: number;
};

export type PlayerAction =
  | { type: "playAll" }
  | { type: "playLine"; line: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "replay" }
  | { type: "ended"; lineCount: number }
  | { type: "stop" };

export const initialPlayerState: PlayerState = {
  mode: "idle",
  currentLine: 0,
  playing: false,
  token: 0,
};

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "playAll":
      return { mode: "all", currentLine: 0, playing: true, token: state.token + 1 };

    case "playLine":
      return { mode: "single", currentLine: action.line, playing: true, token: state.token + 1 };

    case "pause":
      if (state.mode === "idle") return state;
      return { ...state, playing: false };

    case "resume":
      if (state.mode === "idle") return state;
      return { ...state, playing: true };

    case "replay": {
      // Restart the current line (fall back to playing the lesson from the top
      // when nothing has been played yet).
      const mode = state.mode === "idle" ? "single" : state.mode;
      return { ...state, mode, playing: true, token: state.token + 1 };
    }

    case "ended":
      if (state.mode === "all" && state.currentLine < action.lineCount - 1) {
        return { ...state, currentLine: state.currentLine + 1, playing: true, token: state.token + 1 };
      }
      // Single line finished, or the last line of the lesson: stop cleanly.
      return { ...state, mode: "idle", playing: false };

    case "stop":
      return { ...initialPlayerState, token: state.token + 1 };

    default:
      return state;
  }
}

/** The line to highlight on screen, or null when nothing is active. */
export function activeLine(state: PlayerState): number | null {
  return state.mode === "idle" ? null : state.currentLine;
}
