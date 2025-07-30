import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import amplifyConfig from '/amplify_outputs.json';

Amplify.configure(amplifyConfig);

const client = generateClient();

export default function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', image: null });

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data } = await client.models.Note.list();
    const notesWithImages = await Promise.all(
      data.map(async note => {
        if (note.image) {
          const url = await getUrl({ key: note.image });
          return { ...note, imageUrl: url.url };
        }
        return note;
      })
    );
    setNotes(notesWithImages);
  }

  async function createNote(event) {
    event.preventDefault();
    const { name, description, image } = formData;
    if (!name || !description) return;

    let imageKey;
    if (image) {
      const { result } = await uploadData({ key: image.name, data: image });
      imageKey = result.key;
    }

    await client.models.Note.create({
      name,
      description,
      image: imageKey
    });

    setFormData({ name: '', description: '', image: null });
    fetchNotes();
  }

  async function deleteNote(id) {
    await client.models.Note.delete({ id });
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <main style={{ padding: 20 }}>
          <h1>My Notes App</h1>
          <form onSubmit={createNote} style={{ marginBottom: 20 }}>
            <input
              name="name"
              placeholder="Note name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              name="description"
              placeholder="Note description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="file"
              onChange={e => setFormData({ ...formData, image: e.target.files[0] })}
            />
            <button type="submit">Create Note</button>
          </form>
          {notes.map(note => (
            <div key={note.id} style={{ marginBottom: 10 }}>
              <h3>{note.name}</h3>
              <p>{note.description}</p>
              {note.imageUrl && <img src={note.imageUrl} alt="note" style={{ height: 100 }} />}
              <button onClick={() => deleteNote(note.id)}>Delete</button>
            </div>
          ))}
          <button onClick={signOut}>Sign out</button>
        </main>
      )}
    </Authenticator>
  );
}
