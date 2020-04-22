import React, { useState, useCallback, useReducer } from 'react'
import PropTypes from 'prop-types'
import { useHistory, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import { useWallets } from '../../hooks'
import {
  AccountLabel,
  AccountBalance,
  SwitchAccountButton,
  AccountHeader,
  AccountDetail,
  AccountAddress,
  JustifyContentContainer,
  UnderlineOnHover
} from '../StyledComponents'

import CopyToClipboardIcon from '../DisplayWallet/ClipboardIcon'
import { copyToClipboard } from '../../utils'

import { fetchProvider, reducer, initialLedgerState } from '../../utils/ledger'
import { ACCOUNT_BATCH_SIZE, LEDGER } from '../../constants'

import { error } from '../../store/actions'

const AccountPicker = ({ loadingAccounts }) => {
  const { selectedWallet, walletType } = useWallets()
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const history = useHistory()
  const { pathname, search } = useLocation()
  const dispatch = useDispatch()
  const [, dispatchLocal] = useReducer(reducer, initialLedgerState)

  const [clicked, setClicked] = useState(false)

  const onClick = useCallback(() => {
    setCopiedToClipboard(true)
    copyToClipboard(selectedWallet.address)
  }, [selectedWallet.address])

  return (
    <AccountHeader>
      <AccountLabel>Account</AccountLabel>
      <AccountDetail>
        <JustifyContentContainer
          flexDirection='row'
          justifyContent='space-between'
        >
          <AccountAddress role='button' onClick={onClick}>
            {selectedWallet.address}
          </AccountAddress>
          {copiedToClipboard ? (
            <span>&#10003;</span>
          ) : (
            <CopyToClipboardIcon onClick={onClick} />
          )}
        </JustifyContentContainer>
        <JustifyContentContainer
          flexDirection='row'
          justifyContent='space-between'
        >
          <AccountBalance>
            {selectedWallet.balance.toString()} FIL
          </AccountBalance>
          {walletType === LEDGER && !loadingAccounts && selectedWallet && (
            <UnderlineOnHover
              disabled={clicked}
              role='button'
              onClick={async () => {
                if (clicked) return
                setClicked(true)
                try {
                  console.log('FETCHING PROVIDER')
                  const provider = await fetchProvider(dispatchLocal, dispatch)
                  console.log('FETCHED PROVIDER SUCCESS', provider)
                  if (provider) {
                    console.log('about to show address and pub key')
                    await provider.wallet.showAddressAndPubKey(
                      selectedWallet.path
                    )
                    console.log('FINISHED SHOWING')
                  }
                } catch (err) {
                  console.log('CAUGHT AN ERROR', err)
                  dispatch(error(err))
                }
                setClicked(false)
              }}
            >
              {clicked
                ? 'View address on Ledger device'
                : 'Show address on Ledger device'}
            </UnderlineOnHover>
          )}
        </JustifyContentContainer>
      </AccountDetail>
      <SwitchAccountButton
        disabled={loadingAccounts}
        onClick={() => {
          const params = new URLSearchParams(search)
          let page = 0
          if (walletType === LEDGER) {
            page = Math.floor(selectedWallet.path[4] / ACCOUNT_BATCH_SIZE)
          }
          if (pathname.includes('/settings')) {
            params.delete('page')
            const hasParams = Array.from(params).length > 0
            const query = hasParams ? `/?${params.toString()}` : '/'
            history.push(query)
          } else {
            params.set('page', page)
            history.push(`/settings/accounts?${params.toString()}`)
          }
        }}
      >
        {loadingAccounts ? (
          <span role='img' aria-label='loading'>
            ⌛
          </span>
        ) : pathname.includes('/settings') ? (
          <span>Back to wallet</span>
        ) : (
          <span>Switch account</span>
        )}
      </SwitchAccountButton>
    </AccountHeader>
  )
}

AccountPicker.propTypes = {
  loadingAccounts: PropTypes.bool
}

AccountPicker.defaultProps = {
  loadingAccounts: false
}

export default AccountPicker