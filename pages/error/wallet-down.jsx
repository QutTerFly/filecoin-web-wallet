import React from 'react'
import { ErrorView } from '../../components/Shared'

export default () => {
  return (
    <ErrorView
      title='Glif Wallet has run into an error'
      description="We're aware of the issue and will resolve it shortly."
      linkDisplay='Follow @glifwallet for updates.'
      linkhref='https://twitter.com/'
    />
  )
}
