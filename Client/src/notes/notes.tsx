import React, { MouseEvent, ReactElement, useActionState, useCallback, useState } from "react";
import { useVaultContext, VaultData, VaultNote } from "../session/vaultManager.js";
import { NoteDetails } from "./note.js";

export function NotesList(): ReactElement {
	const { vaultData, setVaultData } = useVaultContext();

	const [selectedNote, setSelectedNote] = useState(-1);

	const updateNote = useCallback(async (index: number, newContent: VaultNote | null) => {
		const newVaultData: VaultData = {
			...vaultData,
			notes: [...vaultData.notes],
		};

		if (index < 0 || index >= newVaultData.notes.length)
			throw new Error("Note index out of bounds.");

		if (newContent == null) {
			newVaultData.notes.splice(index, 1);
		} else {
			newVaultData.notes[index] = newContent;
		}


		await setVaultData(newVaultData);
		if (newContent == null) {
			setSelectedNote(-1);
		}
	}, [vaultData, setVaultData]);

	const [error, createNewNote, processing] = useActionState<string, MouseEvent>(async () => {
		const newVaultData: VaultData = {
			...vaultData,
			notes: [...vaultData.notes],
		};

		const newIndex = newVaultData.notes.length;

		// Add the note
		newVaultData.notes.push({
			title: `Note #${ newIndex + 1 }`,
			content: "",
		});

		try {
			await setVaultData(newVaultData);
			setSelectedNote(newIndex);
		} catch (err) {
			console.log("Failed to create new note: ", err);
			return "Error creating new note. Try again later.";
		}

		return "";
	}, "");

	if (selectedNote >= 0 && selectedNote < vaultData.notes.length) {
		return (
			<NoteDetails
				key={ selectedNote }
				note={ vaultData.notes[selectedNote] }
				updateNote={ (newData) => updateNote(selectedNote, newData) }
				close={ () => setSelectedNote(-1) }
			/>
		);
	}

	return (
		<div className="notesList">
			<h1>Personal notes</h1>
			{
				vaultData.notes.map((note, index) => (
					<NoteListItem key={ index } note={ note } open={ () => setSelectedNote(index) } />
				))
			}
			<button
				onClick={ createNewNote }
				disabled={ processing }
			>
				New note
			</button>
			{
				error ? (
					<span className="error">
						{ error }
					</span>
				) : null
			}
		</div>
	);
}

function NoteListItem({ note, open }: {
	note: VaultNote;
	open: () => void;
}): ReactElement {
	const lines = note.content.split("\n").filter(Boolean);

	return (
		<div className="note">
			<h3>{ note.title }</h3>
			<span>
				{ (lines[0] ?? "") + (lines.length > 1 ? " ..." : "") }
			</span>
			<button
				onClick={ open }
			>
				Open
			</button>
		</div>
	);
}
