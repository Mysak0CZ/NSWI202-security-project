import React, { MouseEvent, ReactElement, useActionState, useState } from "react";
import { VaultNote } from "../session/vaultManager.js";

export function NoteDetails({ note, updateNote, close }: {
	note: VaultNote;
	updateNote: (newData: VaultNote | null) => Promise<void>;
	close: () => void;
}): ReactElement {
	const [editing, setEditing] = useState(false);

	const [error, deleteNote, processing] = useActionState<string, MouseEvent>(async () => {
		try {
			if (confirm("Are you sure you want to delete this note?")) {
				await updateNote(null);
			}
		} catch (err) {
			console.log("Failed to delete note: ", err);
			return "Error deleting the note. Try again later.";
		}

		return "";
	}, "");

	if (editing) {
		return (
			<NoteEdit
				title={ note.title }
				content={ note.content }
				save={ (newData) => updateNote(newData).then(() => {
					setEditing(false);
				}) }
			/>
		);
	}

	return (
		<div className="noteDetails">
			<h2>{ note.title }</h2>
			<div>
				<button onClick={ close }>
					Close
				</button>
				<button
					onClick={ deleteNote }
					disabled={ processing }
				>
					Delete
				</button>
				<button onClick={ () => setEditing(true) }>
					Edit
				</button>
			</div>
			{
				error ? (
					<span className="error">{ error }</span>
				) : null
			}
			<textarea readOnly value={ note.content } />
		</div>
	);
}

function NoteEdit({ title: originalTitle, content: originalContent, save }: {
	title: string;
	content: string;
	save: (newData: VaultNote) => Promise<void>;
}): ReactElement {
	const [title, setTitle] = useState(originalTitle);
	const [content, setContent] = useState(originalContent);

	const [error, doSave, processing] = useActionState<string, MouseEvent>(async () => {
		try {
			await save({ title, content });
		} catch (err) {
			console.log("Failed to update note: ", err);
			return "Error updating the note. Try again later.";
		}

		return "";
	}, "");

	return (
		<div className="noteDetails">
			<button onClick={ doSave } disabled={ processing }>
				Save
			</button>
			{
				error ? (
					<span className="error">{ error }</span>
				) : null
			}
			<input
				type="text"
				value={ title }
				onChange={ (ev) => {
					setTitle(ev.target.value);
				} }
			/>
			<textarea
				onChange={ (ev) => {
					setContent(ev.target.value);
				} }
				value={ content }
			/>
		</div>
	);
}
