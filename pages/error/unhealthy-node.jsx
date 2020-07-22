import React from 'react'
import { ErrorView } from '../../components/Shared'

export default () => {
  return (
    <ErrorView
      title='Cannot connect to the network'
      description="We've been notified. Please try again in 10 minutes."
      linkDisplay='Follow @openworklabs for updates.'
      linkhref='https://twitter.com/openworklabs'
    />
  )
}
