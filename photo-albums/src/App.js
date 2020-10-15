import React, {useState, useEffect} from 'react';
import { Form, Button, FormGroup, FormControl, ControlLabel } from "react-bootstrap"

import Amplify, {Auth} from 'aws-amplify'
import API, {graphqlOperation} from '@aws-amplify/api'
import aws_exports from './aws-exports'

import {withAuthenticator} from 'aws-amplify-react'
import {Grid, Header, Input, List, Segment} from 'semantic-ui-react'

import {BrowserRouter as Router, Route, NavLink} from 'react-router-dom';

import * as queries from './graphql/queries'
import * as mutations from './graphql/mutations'
import * as subscriptions from './graphql/subscriptions'

Amplify.configure(aws_exports);
// Added makeComparator to allow us to sanely sort strings in JS
function makeComparator(key, order = 'asc') {
  return (a, b) => {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) 
      return 0;
    
    const aVal = (typeof a[key] === 'string')
      ? a[key].toUpperCase()
      : a[key];
    const bVal = (typeof b[key] === 'string')
      ? b[key].toUpperCase()
      : b[key];

    let comparison = 0;
    if (aVal > bVal) 
      comparison = 1;
    if (aVal < bVal) 
      comparison = -1;
    
    return order === 'desc'
      ? (comparison * -1)
      : comparison
  };
}

const NewAlbum = () => {
  const [name,
    setName] = useState('')
  const [year,
    setYear] = useState('')
    
  const handleSubmit = async(event) => {
    event.preventDefault();
    await API.graphql(graphqlOperation(mutations.createAlbum, {input: {
        name,year
      }}))
    setName('')
    setYear('')
  }

  return (
    <Segment>
      <Header as='h3'>Add a new album </Header>

      <Form useRef ="form" >
      
        <Input
          type='text'
          placeholder='New Album Name'
          icon='plus'
          iconPosition='left'
          name='name'
          value={name}
          onChange={(e) => setName(e.target.value)}/>

        <Input
          type='text'
          placeholder='Year'
          // icon='plus'
          iconPosition='right'
          name='year'
          value={year}
          onChange={(e) => setYear(e.target.value)}/>
        
        <button type="submit" onClick={handleSubmit}>Create</button>
        

      </Form>
    </Segment>
  )
}

const AlbumsList = () => {
  const [albums,
    setAlbums] = useState([])

  useEffect(() => {
    async function fetchData() {
      const result = await API.graphql(graphqlOperation(queries.listAlbums, {limit: 999}))
      setAlbums(result.data.listAlbums.items)
    }
    fetchData()
  }, [])

  useEffect(() => {
    let subscription
    async function setupSubscription() {
      const user = await Auth.currentAuthenticatedUser()
      subscription = API.graphql(graphqlOperation(subscriptions.onCreateAlbum, {owner: user.username})).subscribe({
        next: (data) => {
          const album = data.value.data.onCreateAlbum
          setAlbums(a => a.concat([album].sort(makeComparator('name'))))
        }
      })
    }
    setupSubscription()

    return () => subscription.unsubscribe();
  }, [])

  const albumItems = () => {
    return albums
      .sort(makeComparator('name'))
      .map(album => <List.Item key={album.id}>
        <NavLink to={`/albums/${album.id}`}>{album.name}</NavLink>
      </List.Item>);
  }

  return (
    <Segment>
      <Header as='h3'>My Albums</Header>
      <List divided relaxed>
        {albumItems()}
      </List>
    </Segment>
  );
}

const AlbumDetails = (props) => {
  const [album,
    setAlbum] = useState({name: 'Loading...',year: 'Loading...', photos: []})

  useEffect(() => {
    const loadAlbumInfo = async() => {
      const results = await API.graphql(graphqlOperation(queries.getAlbum, {id: props.id}))
      setAlbum(results.data.getAlbum)
    }

    loadAlbumInfo()
  }, [props.id])

  return (
    <Segment>
      <Header as='h3'>{album.name} {album.year}</Header>
      <p>TODO LATER IN WORKSHOP: Allow photo uploads</p>
      <p>TODO LATER IN WORKSHOP: Show photos for this album</p>
    </Segment>
  )
}

function App() {
  return (
    <Router>
      <Grid padded>
        <Grid.Column>
          <Route path="/" exact component={NewAlbum}/>
          <Route path="/" exact component={AlbumsList}/>

          <Route
            path="/albums/:albumId"
            render={() => <div>
            <NavLink to='/'>Back to Albums list</NavLink>
          </div>}/>
          <Route
            path="/albums/:albumId"
            render={props => <AlbumDetails id={props.match.params.albumId}/>}/>
        </Grid.Column>
      </Grid>
    </Router>
  )
}

export default withAuthenticator(App, {
  includeGreetings: true,
  signUpConfig: {
    hiddenDefaults: ['phone_number']
  }
})

