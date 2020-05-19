import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../Common/DataObjects/Pitch";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import { MusicSheetCalculator } from "./MusicSheetCalculator";

/**
 * Compute the accidentals for notes according to the current key instruction
 */
export class AccidentalCalculator {
    // holds all keys that are altered by the key signature, including their current alteration
    private keySignatureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();

    // holds all keys that have been altered previously - also in other previous measures
    private storedPreviouslyAlteratedKeys: number[] = [];

    // holds all keys that have been altered within the current measure
    // this dict is always cleared at the end of a measure and then
    // prefilled with all the keys of the current key signature
    private currentInMeasureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private activeKeyInstruction: KeyInstruction;

    public get ActiveKeyInstruction(): KeyInstruction {
        return this.activeKeyInstruction;
    }

    public set ActiveKeyInstruction(value: KeyInstruction) {
        this.activeKeyInstruction = value;
        this.reactOnKeyInstructionChange();
    }

    /**
     * This method is called after each Measure
     */
    public doCalculationsAtEndOfMeasure(): void {
        // 1. clear the in-measure alterations dict:
        this.currentInMeasureNoteAlterationsDict.clear();
        // 2. preload the in-measure alterations dict with the alterations of the key signature:
        for (const key of this.keySignatureNoteAlterationsDict.keys()) {
            this.currentInMeasureNoteAlterationsDict.setValue(key, this.keySignatureNoteAlterationsDict.getValue(key));
        }
    }

    public checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch): void {
        if (pitch === undefined) {
            return;
        }
        const pitchKey: number = <number>pitch.FundamentalNote + pitch.Octave * 12;
        /*let pitchKeyGivenInMeasureDict: boolean = this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey);
        if (
            (pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental !== AccidentalEnum.NONE)
        ) {
            if (this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) === -1) {
                this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
            }
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
        } else if (
            this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) !== -1
            && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental === AccidentalEnum.NONE))
        ) {
            this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
        }*/

        const keyHasBeenAlteratedPreviously: boolean = this.storedPreviouslyAlteratedKeys.indexOf(pitchKey) >= 0;
        if (this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey)) {
            // key has been alterated within this measure
            // OR is a key of the key signature (they get always copied to this dict freshly at the end of every measure):
            if (this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones
                || keyHasBeenAlteratedPreviously) {
                if (keyHasBeenAlteratedPreviously) {
                    // if this is the reason why we entered the outer if-statement, then a courtesty accidental will be drawn here finally
                    // as first step: remove the entry in the stored alterations list
                    this.storedPreviouslyAlteratedKeys.splice(this.storedPreviouslyAlteratedKeys.indexOf(pitchKey), 1);
                }
                const isOnKeySignatureKey: boolean = this.keySignatureNoteAlterationsDict.containsKey(pitchKey);
                if (!isOnKeySignatureKey && pitch.AccidentalHalfTones !== 0 ||
                    isOnKeySignatureKey && this.keySignatureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones) {
                    // we are not back to the expected accidental for this key:
                    this.storedPreviouslyAlteratedKeys.push(pitchKey);
                    this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                } else {
                    // this key is back to the expected accidental:
                    this.currentInMeasureNoteAlterationsDict.remove(pitchKey);
                }
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            }
        // here to key has not been alterated within this measure
        // AND is also not part of a key signature key:
        } else {
            // if there is an alteration present:
            if (pitch.Accidental !== AccidentalEnum.NONE && pitch.Accidental !== AccidentalEnum.NATURAL) {
                // if not already done, remember this alteration:
                if (!keyHasBeenAlteratedPreviously) {
                    this.storedPreviouslyAlteratedKeys.push(pitchKey);
                }
                // store this also for within this measure:
                this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            // no alteration now:
            } else {
                // if the key has been altered somewhen previously, draw a courtesty accidental:
                if (keyHasBeenAlteratedPreviously) {
                    this.storedPreviouslyAlteratedKeys.splice(this.storedPreviouslyAlteratedKeys.indexOf(pitchKey), 1);
                    MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
                }
            }
        }
    }

    private reactOnKeyInstructionChange(): void {
        const noteEnums: NoteEnum[] = KeyInstruction.getNoteEnumList(this.activeKeyInstruction);
        let keyAccidentalType: AccidentalEnum;
        if (this.activeKeyInstruction.Key > 0) {
            keyAccidentalType = AccidentalEnum.SHARP;
        } else {
            keyAccidentalType = AccidentalEnum.FLAT;
        }
        this.keySignatureNoteAlterationsDict.clear();
        this.storedPreviouslyAlteratedKeys.length = 0;
        for (let octave: number = -9; octave < 9; octave++) {
            for (let i: number = 0; i < noteEnums.length; i++) {
                this.keySignatureNoteAlterationsDict.setValue(<number>noteEnums[i] + octave * 12, Pitch.HalfTonesFromAccidental(keyAccidentalType));
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}
